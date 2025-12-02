import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import invariant from 'tiny-invariant';

import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';
import * as liveRegion from '@atlaskit/pragmatic-drag-and-drop-live-region';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { monitorForExternal } from '@atlaskit/pragmatic-drag-and-drop/external/adapter';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import { containsFiles, getFiles } from '@atlaskit/pragmatic-drag-and-drop/external/file';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';

import { type ColumnData, type CardData, type FrameCard, type BoardState, type Trigger, type Outcome, getFrame, getNextCardId, type CardUpdate, type ColumnUpdate, type BoardUpdate, type ImageColumn, type EventColumn } from './models';
import Board from './pieces/board';
import { BoardContext, type BoardContextValue } from './pieces/board-context';
import { Column } from './pieces/column';
import { createRegistry } from './pieces/registry';
import General from './pieces/general';
import { ColumnAdder } from './pieces/column-adder';
import { Box, Stack, xcss } from '@atlaskit/primitives';
import { dumpAnn, type ANN } from './fileFormats/ann';
import { Jimp } from "jimp";
import { readImageFile } from './event-handling';

const eventScrollContainerStyles = xcss({
	maxWidth: '100%',
	overflowX: 'auto',
	display: 'flex',
	gap: 'space.200',
	flexDirection: 'row',
	width: '100%',
	paddingInline: 'space.150',
});

function saveBlob(filename: string, blob: Blob) {
	var link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = filename;
	link.click();
};

export default function BoardExample({ instanceId, initialData, onClear }: { instanceId: symbol, initialData: BoardState, onClear: () => void }) {
	const [data, setData] = useState<BoardState>(initialData);

	const stableData = useRef(data);
	useEffect(() => {
		stableData.current = data;
	}, [data]);

	const [registry] = useState(createRegistry);

	const { lastOperation } = data;

	useEffect(() => {
		if (lastOperation === null) {
			return;
		}
		const { outcome, trigger } = lastOperation;

		if (outcome.type === 'column-reorder') {
			const { startIndex, finishIndex } = outcome;

			const { columnMap, orderedColumnIds } = stableData.current;
			const sourceColumn = columnMap[orderedColumnIds[finishIndex]];

			const entry = registry.getColumn(sourceColumn.columnId);
			triggerPostMoveFlash(entry.element);

			liveRegion.announce(
				`You've moved ${sourceColumn.columnId} from position ${startIndex + 1
				} to position ${finishIndex + 1} of ${orderedColumnIds.length}.`,
			);

			return;
		}

		if (outcome.type === 'column-insert') {
			const { finishIndex } = outcome;

			const { columnMap, orderedColumnIds } = stableData.current;
			const sourceColumn = columnMap[orderedColumnIds[finishIndex]];

			const entry = registry.getColumn(sourceColumn.columnId);
			triggerPostMoveFlash(entry.element);

			liveRegion.announce(
				`You've inserted ${sourceColumn.columnId} to position ${finishIndex + 1} of ${orderedColumnIds.length}.`,
			);

			return;
		}

		if (outcome.type === 'column-remove') {
			const { startIndex } = outcome;

			liveRegion.announce(
				`You've removed column from position ${startIndex + 1}.`,
			);

			return;
		}

		if (outcome.type === 'card-reorder') {
			const { columnId, startIndex, finishIndex } = outcome;

			const { columnMap } = stableData.current;
			const column = columnMap[columnId];
			const item = column.items[finishIndex];

			const entry = registry.getCard(item.cardId);
			triggerPostMoveFlash(entry.element);

			if (trigger !== 'keyboard') {
				return;
			}

			liveRegion.announce(
				`You've moved ${item.name} from position ${startIndex + 1
				} to position ${finishIndex + 1} of ${column.items.length} in the ${column.columnId} column.`,
			);

			return;
		}

		if (outcome.type === 'card-move') {
			const { finishColumnId, itemIndexInStartColumn, itemIndexInFinishColumn } = outcome;

			const data = stableData.current;
			const destinationColumn = data.columnMap[finishColumnId];
			const item = destinationColumn.items[itemIndexInFinishColumn];

			const finishPosition =
				typeof itemIndexInFinishColumn === 'number'
					? itemIndexInFinishColumn + 1
					: destinationColumn.items.length;

			const entry = registry.getCard(item.cardId);
			triggerPostMoveFlash(entry.element);

			if (trigger !== 'keyboard') {
				return;
			}

			liveRegion.announce(
				`You've moved ${item.name} from position ${itemIndexInStartColumn + 1
				} to position ${finishPosition} in the ${destinationColumn.columnId} column.`,
			);

			/**
			 * Because the card has moved column, it will have remounted.
			 * This means we need to manually restore focus to it.
			 */
			entry.actionMenuTrigger.focus();

			return;
		}

		if (outcome.type === 'card-insert') {
			const { finishColumnId, itemIndexInFinishColumn } = outcome;

			const data = stableData.current;
			const destinationColumn = data.columnMap[finishColumnId];
			const item = destinationColumn.items[itemIndexInFinishColumn];

			const finishPosition =
				typeof itemIndexInFinishColumn === 'number'
					? itemIndexInFinishColumn + 1
					: destinationColumn.items.length;

			const entry = registry.getCard(item.cardId);
			triggerPostMoveFlash(entry.element);

			if (trigger !== 'keyboard') {
				return;
			}

			liveRegion.announce(
				`You've inserted ${item.name} to position ${finishPosition} in the ${destinationColumn.columnId} column.`,
			);

			/**
			 * Because the card has moved column, it will have remounted.
			 * This means we need to manually restore focus to it.
			 */
			entry.actionMenuTrigger.focus();

			return;
		}

		if (outcome.type === 'card-remove') {
			const { startColumnId, itemIndexInStartColumn } = outcome;
			const entry = registry.getColumn(startColumnId);
			triggerPostMoveFlash(entry.element);

			if (trigger !== 'keyboard') {
				return;
			}

			liveRegion.announce(
				`You've removed item from position ${itemIndexInStartColumn + 1
				} in the ${startColumnId} column.`,
			);

			return;
		}
	}, [lastOperation, registry]);

	useEffect(() => {
		return liveRegion.cleanup();
	}, []);

	const getColumns = useCallback(() => {
		const { columnMap, orderedColumnIds } = stableData.current;
		return orderedColumnIds.map((columnId) => columnMap[columnId]);
	}, []);

	const reorderColumn = useCallback(
		({
			startIndex,
			finishIndex,
			trigger = 'keyboard',
		}: {
			startIndex: number;
			finishIndex: number;
			trigger?: Trigger;
		}) => {
			setData((data) => {
				const outcome: Outcome = {
					type: 'column-reorder',
					columnId: data.orderedColumnIds[startIndex],
					startIndex,
					finishIndex,
				};

				return {
					...data,
					orderedColumnIds: reorder({
						list: data.orderedColumnIds,
						startIndex,
						finishIndex,
					}),
					lastOperation: {
						outcome,
						trigger: trigger,
					},
				};
			});
		},
		[],
	);

	const insertColumn = useCallback(
		({
			column,
			finishIndex,
			trigger = 'keyboard',
		}: {
			column: ColumnData;
			finishIndex: number;
			trigger?: Trigger;
		}) => {
			const columnId = column.columnId;
			setData((data) => {
				const outcome: Outcome = {
					type: 'column-insert',
					columnId,
					finishIndex,
				};
				const orderedColumnIds = [...data.orderedColumnIds];
				orderedColumnIds.splice(finishIndex, 0, columnId);
				return {
					...data,
					columnMap: { ...data.columnMap, [columnId]: column },
					orderedColumnIds,
					lastOperation: {
						outcome,
						trigger: trigger,
					},
				};
			});
		},
		[],
	);

	const removeColumn = useCallback(
		({
			startIndex,
			trigger = 'keyboard',
		}: {
			startIndex: number;
			trigger?: Trigger;
		}) => {
			setData((data) => {
				const columnId = data.orderedColumnIds[startIndex];
				const column = data.columnMap[columnId];

				const outcome: Outcome = {
					type: 'column-remove',
					columnId: data.orderedColumnIds[startIndex],
					startIndex,
				};

				if (column.type === 'image-column') {
					return {
						...data,
						orderedColumnIds: [],
						columnMap: {},
						lastOperation: {
							outcome,
							trigger,
						}
					}
				}

				const { [columnId]: _, ...updatedColumnMap } = data.columnMap;
				return {
					...data,
					orderedColumnIds: data.orderedColumnIds.filter(id => id !== columnId),
					columnMap: updatedColumnMap,
					lastOperation: {
						outcome,
						trigger,
					},
				};
			});
		},
		[],
	);

	const reorderCard = useCallback(
		({
			columnId,
			startIndex,
			finishIndex,
			trigger = 'keyboard',
		}: {
			columnId: string;
			startIndex: number;
			finishIndex: number;
			trigger?: Trigger;
		}) => {
			setData((data) => {
				const sourceColumn = data.columnMap[columnId];
				const updatedItems = reorder({
					list: sourceColumn.items,
					startIndex,
					finishIndex,
				});

				const outcome: Outcome | null = {
					type: 'card-reorder',
					columnId,
					startIndex,
					finishIndex,
				};

				return {
					...data,
					columnMap: {
						...data.columnMap,
						[columnId]: {
							...sourceColumn,
							items: updatedItems,
						},
					},
					lastOperation: {
						trigger,
						outcome,
					},
				};
			});
		},
		[],
	);

	const moveCard = useCallback(
		({
			startColumnId,
			finishColumnId,
			itemIndexInStartColumn,
			itemIndexInFinishColumn,
			trigger = 'keyboard',
		}: {
			startColumnId: string;
			finishColumnId: string;
			itemIndexInStartColumn: number;
			itemIndexInFinishColumn?: number;
			trigger?: Trigger,
		}) => {
			// invalid cross column movement
			if (startColumnId === finishColumnId) {
				return;
			}
			setData((data) => {
				const sourceColumn = data.columnMap[startColumnId];
				const destinationColumn = data.columnMap[finishColumnId];
				const item: CardData = sourceColumn.items[itemIndexInStartColumn];
				const shouldCopy = item.type === 'image-card';
				const itemCopy: FrameCard = item.type === 'image-card' ? getFrame(item) : { ...item, cardId: `id:${getNextCardId()}` };

				const destinationItems = [...destinationColumn.items];
				// Going into the last position if no index is provided
				const newIndexInDestination = itemIndexInFinishColumn ?? destinationItems.length;
				destinationItems.splice(newIndexInDestination, 0, shouldCopy ? itemCopy : item);

				const updatedMap = {
					...data.columnMap,
					[startColumnId]: {
						...sourceColumn,
						items: sourceColumn.items.filter((i) => shouldCopy || i.cardId !== item.cardId),
					},
					[finishColumnId]: {
						...destinationColumn,
						items: destinationItems,
					},
				};

				const outcome: Outcome | null = {
					type: 'card-move',
					finishColumnId,
					itemIndexInStartColumn,
					itemIndexInFinishColumn: newIndexInDestination,
				};

				return {
					...data,
					columnMap: updatedMap,
					lastOperation: {
						outcome,
						trigger: trigger,
					},
				};
			});
		},
		[],
	);

	const insertCard = useCallback(
		({
			item,
			finishColumnId,
			itemIndexInFinishColumn,
			trigger = 'keyboard',
		}: {
			item: CardData;
			finishColumnId: string;
			itemIndexInFinishColumn?: number;
			trigger?: Trigger,
		}) => {
			setData((data) => {
				const destinationColumn = data.columnMap[finishColumnId];
				const destinationItems = [...destinationColumn.items];
				// Going into the last position if no index is provided
				const newIndexInDestination = itemIndexInFinishColumn ?? destinationItems.length;
				destinationItems.splice(newIndexInDestination, 0, item);

				const updatedMap = {
					...data.columnMap,
					[finishColumnId]: {
						...destinationColumn,
						items: destinationItems,
					},
				};

				const outcome: Outcome | null = {
					type: 'card-insert',
					finishColumnId,
					itemIndexInFinishColumn: newIndexInDestination,
				};

				return {
					...data,
					columnMap: updatedMap,
					lastOperation: {
						outcome,
						trigger,
					},
				};
			});
		},
		[],
	);

	const removeCard = useCallback(
		({
			startColumnId,
			itemIndexInStartColumn,
			trigger = 'keyboard',
		}: {
			startColumnId: string;
			itemIndexInStartColumn: number;
			trigger?: Trigger,
		}) => {
			setData((data) => {
				const sourceColumn = data.columnMap[startColumnId];
				const item: CardData = sourceColumn.items[itemIndexInStartColumn];

				const updatedMap = {
					...data.columnMap,
					[startColumnId]: {
						...sourceColumn,
						items: sourceColumn.items.filter((i) => i.cardId !== item.cardId),
					},
				};
				if (item.type === 'image-card') {
					for (const columnId of Object.keys(updatedMap)) {
						updatedMap[columnId].items = updatedMap[columnId].items
							.filter(card => !(card.type === 'frame-card' && card.imageRef.cardId === item.cardId));
					}
				}

				const outcome: Outcome | null = {
					type: 'card-remove',
					startColumnId,
					itemIndexInStartColumn,
				};

				return {
					...data,
					columnMap: updatedMap,
					lastOperation: {
						outcome,
						trigger: trigger,
					},
				};
			});
		},
		[],
	);

	const flashCard = useCallback(
		({ cardId }: { cardId: string; }) => {
			const entry = registry.getCard(cardId);
			entry.element.scrollIntoView();
			triggerPostMoveFlash(entry.element);
		},
		[],
	);

	const flashColumn = useCallback(
		({ columnId }: { columnId: string; }) => {
			const entry = registry.getColumn(columnId);
			entry.element.scrollIntoView();
			triggerPostMoveFlash(entry.element);
		},
		[],
	);

	const updateCard = useCallback(
		({ columnId, cardId, cardUpdate }: { columnId: string; cardId: string; cardUpdate: CardUpdate; }) => {
			setData((data) => {
				const columnToUpdate = data.columnMap[columnId];
				const cardIndex = columnToUpdate.items.findIndex(c => c.cardId === cardId);
				if (cardIndex < 0) {
					console.error('Card not found');
					return data;
				}
				const cardToUpdate = columnToUpdate.items[cardIndex];
				const updatedItems = [...columnToUpdate.items];
				const updatedCard = { ...cardToUpdate };
				if (cardUpdate.name !== undefined) {
					updatedCard.name = cardUpdate.name;
				}
				if (cardUpdate.offsetX !== undefined) {
					updatedCard.offset.x = cardUpdate.offsetX;
				}
				if (cardUpdate.offsetY !== undefined) {
					updatedCard.offset.y = cardUpdate.offsetY;
				}
				switch (updatedCard.type) {
					case 'image-card': {
						if (cardUpdate.type !== 'image-card') {
							console.error('Incompatible card update type');
							return data;
						}
						if (cardUpdate.contentUrl !== undefined) {
							updatedCard.contentUrl = cardUpdate.contentUrl;
						}
						break;
					}
					default: {
						if (cardUpdate.type !== 'frame-card') {
							console.error('Incompatible card update type');
							return data;
						}
						if (cardUpdate.imageRef !== undefined) {
							updatedCard.imageRef = cardUpdate.imageRef;
						}
						if (cardUpdate.opacity !== undefined) {
							updatedCard.opacity = cardUpdate.opacity;
						}
						if (cardUpdate.sfx !== undefined) {
							updatedCard.sfx = cardUpdate.sfx;
						}
						break;
					}
				}
				updatedItems[cardIndex] = updatedCard;
				const updatedMap = {
					...data.columnMap,
					[columnId]: {
						...columnToUpdate,
						items: updatedItems,
					},
				};
				if (updatedCard.type === 'image-card') {
					for (const columnId of Object.keys(updatedMap)) {
						if (updatedMap[columnId].items.every(i => i.type !== 'frame-card' || i.imageRef.cardId !== cardId)) {
							continue;
						}
						updatedMap[columnId] = { ...updatedMap[columnId], items: [...updatedMap[columnId].items] };
						for (let itemIndex = 0; itemIndex < updatedMap[columnId].items.length; itemIndex++) {
							const item = updatedMap[columnId].items[itemIndex];
							if (item.type === 'frame-card' && item.imageRef.cardId === cardId) {
								updatedMap[columnId].items[itemIndex] = {
									...item,
									imageRef: updatedCard,
								};
							}
						}
					}
				}

				return {
					...data,
					columnMap: updatedMap,
				};
			});
		},
		[],
	);

	const updateColumn = useCallback(
		({ columnId, columnUpdate }: { columnId: string; columnUpdate: ColumnUpdate; }) => {
			setData((data) => {
				const columnToUpdate = data.columnMap[columnId];
				const updatedColumn = { ...columnToUpdate };
				switch (updatedColumn.type) {
					case 'image-column': {
						if (columnUpdate.type !== 'image-column') {
							console.error('Incompatible card update type');
							return data;
						}
						break;
					}
					default: {
						if (columnUpdate.type !== 'event-column') {
							console.error('Incompatible card update type');
							return data;
						}
						if (columnUpdate.name !== undefined) {
							updatedColumn.name = columnUpdate.name;
						}
						if (columnUpdate.opacity !== undefined) {
							updatedColumn.opacity = columnUpdate.opacity;
						}
						if (columnUpdate.loopLength !== undefined) {
							updatedColumn.loopLength = columnUpdate.loopLength;
						}
						break;
					}
				}

				return {
					...data,
					columnMap: {
						...data.columnMap,
						[columnId]: updatedColumn,
					},
				};
			});
		},
		[],
	);

	const updateBoard = useCallback(
		({ boardUpdate }: { boardUpdate: BoardUpdate; }) => {
			setData((data) => {
				return {
					...data,
					filename: boardUpdate.filename === undefined ? data.filename : boardUpdate.filename,
					fps: boardUpdate.fps === undefined ? data.fps : boardUpdate.fps,
					opacity: boardUpdate.opacity === undefined ? data.opacity : boardUpdate.opacity,
					author: boardUpdate.author === undefined ? data.author : boardUpdate.author,
					description: boardUpdate.description === undefined ? data.description : boardUpdate.description,
				};
			});
		},
		[],
	);

	const eventScrollableRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		invariant(eventScrollableRef.current);
		return combine(
			monitorForExternal({
				canMonitor: containsFiles,
				onDragStart: () => {
					preventUnhandled.start();
				},
				onDrop: (args) => {
					const { location, source } = args;
					// didn't drop on anything
					if (!location.current.dropTargets.length) {
						return;
					}

					preventUnhandled.stop();

					const { finishColumnId, itemIndexInFinishColumn, trigger }: { finishColumnId: string, itemIndexInFinishColumn?: number, trigger: Trigger } = (() => {
						// dropping in a column (outside cards)
						if (location.current.dropTargets.length === 1) {
							const [destinationColumnRecord] = location.current.dropTargets;
							const destinationId = destinationColumnRecord.data.columnId;
							invariant(typeof destinationId === 'string');
							const destinationColumn = data.columnMap[destinationId];
							invariant(destinationColumn);
							return {
								finishColumnId: destinationColumn.columnId,
								trigger: 'pointer',
							};
						}

						// dropping in a column (relative to a card)
						const [destinationCardRecord, destinationColumnRecord] = location.current.dropTargets;
						const destinationColumnId = destinationColumnRecord.data.columnId;
						invariant(typeof destinationColumnId === 'string');
						const destinationColumn = data.columnMap[destinationColumnId];
						const indexOfTarget = destinationColumn.items.findIndex(
							(item) => item.cardId === destinationCardRecord.data.cardId,
						);
						const closestEdgeOfTarget: Edge | null = extractClosestEdge(
							destinationCardRecord.data,
						);
						const destinationIndex =
							closestEdgeOfTarget === 'bottom' ? indexOfTarget + 1 : indexOfTarget;
						return {
							finishColumnId: destinationColumn.columnId,
							itemIndexInFinishColumn: destinationIndex < 0 ? destinationColumn.items.length : destinationIndex,
							trigger: 'pointer',
						};
					})();

					const files = getFiles({ source });
					files.forEach(async (file) => {
						const { contentUrl, offset } = await readImageFile(file);
						const cardId = `id:${getNextCardId()}`;
						insertCard({
							item: {
								type: 'image-card',
								cardId,
								name: file.name.replace(/\.[a-z0-9]+$/i, ''),
								contentUrl,
								offset,
							},
							finishColumnId,
							itemIndexInFinishColumn,
							trigger,
						});
					});
				},
			}),
			monitorForElements({
				canMonitor({ source }) {
					return source.data.instanceId === instanceId;
				},
				onDrop(args) {
					const { location, source } = args;
					// didn't drop on anything
					if (!location.current.dropTargets.length) {
						return;
					}
					// need to handle drop

					// 1. remove element from original position
					// 2. move to new position

					if (source.data.type === 'column') {
						const startIndex: number = data.orderedColumnIds.findIndex(
							(columnId) => columnId === source.data.columnId,
						);

						const target = location.current.dropTargets[0];
						const indexOfTarget: number = data.orderedColumnIds.findIndex(
							(id) => id === target.data.columnId,
						);
						const closestEdgeOfTarget: Edge | null = extractClosestEdge(target.data);

						const finishIndex = getReorderDestinationIndex({
							startIndex,
							indexOfTarget,
							closestEdgeOfTarget,
							axis: 'horizontal',
						});

						reorderColumn({ startIndex, finishIndex, trigger: 'pointer' });
					}
					// Dragging a card
					if (source.data.type === 'card') {
						const cardId = source.data.cardId;
						invariant(typeof cardId === 'string');
						// TODO: these lines not needed if item has columnId on it
						const [, startColumnRecord] = location.initial.dropTargets;
						const sourceId = startColumnRecord.data.columnId;
						invariant(typeof sourceId === 'string');
						const sourceColumn = data.columnMap[sourceId];
						const itemIndex = sourceColumn.items.findIndex((item) => item.cardId === cardId);

						if (location.current.dropTargets.length === 1) {
							const [destinationColumnRecord] = location.current.dropTargets;
							const destinationId = destinationColumnRecord.data.columnId;
							invariant(typeof destinationId === 'string');
							const destinationColumn = data.columnMap[destinationId];
							invariant(destinationColumn);

							// reordering in same column
							if (sourceColumn === destinationColumn) {
								const destinationIndex = getReorderDestinationIndex({
									startIndex: itemIndex,
									indexOfTarget: sourceColumn.items.length - 1,
									closestEdgeOfTarget: null,
									axis: 'vertical',
								});
								reorderCard({
									columnId: sourceColumn.columnId,
									startIndex: itemIndex,
									finishIndex: destinationIndex,
									trigger: 'pointer',
								});
								return;
							}

							// moving to a new column
							moveCard({
								itemIndexInStartColumn: itemIndex,
								startColumnId: sourceColumn.columnId,
								finishColumnId: destinationColumn.columnId,
								trigger: 'pointer',
							});
							return;
						}

						// dropping in a column (relative to a card)
						if (location.current.dropTargets.length === 2) {
							const [destinationCardRecord, destinationColumnRecord] = location.current.dropTargets;
							const destinationColumnId = destinationColumnRecord.data.columnId;
							invariant(typeof destinationColumnId === 'string');
							const destinationColumn = data.columnMap[destinationColumnId];

							const indexOfTarget = destinationColumn.items.findIndex(
								(item) => item.cardId === destinationCardRecord.data.cardId,
							);
							const closestEdgeOfTarget: Edge | null = extractClosestEdge(
								destinationCardRecord.data,
							);

							// case 1: ordering in the same column
							if (sourceColumn === destinationColumn) {
								const destinationIndex = getReorderDestinationIndex({
									startIndex: itemIndex,
									indexOfTarget,
									closestEdgeOfTarget,
									axis: 'vertical',
								});
								reorderCard({
									columnId: sourceColumn.columnId,
									startIndex: itemIndex,
									finishIndex: destinationIndex,
									trigger: 'pointer',
								});
								return;
							}

							// case 2: moving into a new column relative to a card

							const destinationIndex =
								closestEdgeOfTarget === 'bottom' ? indexOfTarget + 1 : indexOfTarget;

							moveCard({
								itemIndexInStartColumn: itemIndex,
								startColumnId: sourceColumn.columnId,
								finishColumnId: destinationColumn.columnId,
								itemIndexInFinishColumn: destinationIndex,
								trigger: 'pointer',
							});
						}
					}
				},
			}),
			autoScrollForElements({
				element: eventScrollableRef.current,
				canScroll: ({ source }) => source.data.instanceId === instanceId,
			})
		);
	}, [data, instanceId, moveCard, insertCard, removeCard, reorderCard, insertColumn, removeColumn, reorderColumn]);

	const contextValue: BoardContextValue = useMemo(() => {
		return {
			getFilename: () => data.filename,
			getColumns,
			reorderColumn,
			insertColumn,
			removeColumn,
			reorderCard,
			moveCard,
			insertCard,
			removeCard,
			registerCard: registry.registerCard,
			registerColumn: registry.registerColumn,
			flashCard,
			flashColumn,
			updateCard,
			updateColumn,
			updateBoard,
			instanceId,
		};
	}, [getColumns, reorderColumn, reorderCard, registry, insertColumn, removeColumn, moveCard, insertCard, removeCard, flashCard, flashColumn, updateCard, updateColumn, updateBoard, instanceId]);

	const onSave = useCallback(async () => {
		const events = Object.values(data.columnMap).filter(c => c.type === 'event-column');
		const images = (Object.values(data.columnMap).find(c => c.type === 'image-column')?.items ?? []).filter(i => i.type === 'image-card');
		const bitmaps = (await Promise.all(images.map(i => Jimp.read(i.contentUrl)))).map(i => i.bitmap);

		const annToSave: ANN = {
			header: {
				author: data.author.trim(),
				description: data.description.trim(),
				fps: Math.max(0, data.fps),
				bpp: 16,
				flags: 0,
				transparency: data.opacity,
				randomFramesNumber: 0,
				eventsCount: events.length,
				framesCount: images.length,
			},
			events: events.map(e => {
				const frames = e.items.filter(i => i.type === 'frame-card');
				return {
					name: e.name.trim(),
					transparency: e.opacity,
					loopAfterFrame: e.loopLength,
					framesCount: e.items.length,
					framesImageMapping: frames.map(f => images.findIndex(i => i.cardId === f.imageRef.cardId)),
					frames: frames.map(f => ({
						positionX: f.offset.x,
						positionY: f.offset.y,
						hasSounds: f.sfx.length > 0 ? 1 : 0,
						transparency: f.opacity,
						name: f.name.trim(),
						sounds: f.sfx,
					})),
				};
			}),
			annImages: images.map((image, index) => ({
				name: image.name,
				width: bitmaps[index].width,
				height: bitmaps[index].height,
				positionX: image.offset.x,
				positionY: image.offset.y,
				compressionType: 0,
				imageLen: bitmaps[index].data.byteLength >> 1,
				alphaLen: bitmaps[index].data.byteLength >> 2,
			})),
			images: bitmaps.map(i => i.data as Uint8Array<ArrayBuffer>),
		};
		const annData = dumpAnn(annToSave);
		saveBlob(data.filename + '.ann', annData);
	}, [data]);

	const imageColumns = data.orderedColumnIds.map(columnId => data.columnMap[columnId]).filter(({ type }) => type === 'image-column') as ImageColumn[];
	const eventColumns = data.orderedColumnIds.map(columnId => data.columnMap[columnId]).filter(({ type }) => type === 'event-column') as EventColumn[];

	return (
		<BoardContext.Provider value={contextValue}>
			<General {...data} onClear={onClear} onSave={onSave} />
			<hr style={{ color: 'gray' }} />
			<Board>
				{imageColumns.map((column, order) => {
					return <Column column={column} order={order} key={column.columnId} />;
				})}
				<Box xcss={eventScrollContainerStyles} ref={eventScrollableRef}>
					<Stack alignBlock="center" xcss={xcss({ position: 'relative', width: 'inherit', padding: 'space.200', textAlign: 'center', opacity: '75%', fontSize: '0.9em', display: eventColumns.length > 0 ? 'none' : undefined })}>
						<span style={{ fontWeight: 'bold' }}>No events here!</span>
						<br />
						<span>
							To add an event, click the Create event button on the right.
						</span>
					</Stack>
					{eventColumns.map((column, order) => {
						return <Column column={column} order={order} key={column.columnId} />;
					})}
				</Box>
				<ColumnAdder />
			</Board>
		</BoardContext.Provider>
	);
}

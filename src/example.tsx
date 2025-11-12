import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import invariant from 'tiny-invariant';
import { bind, type UnbindFn } from 'bind-event-listener';

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

import { type ColumnMap, type ColumnData, getInitialBoardState, type CardData, type FrameCard, type BoardState, type Trigger, type Outcome, getFrame, getNextCardId } from './models';
import Board from './pieces/board';
import { BoardContext, type BoardContextValue } from './pieces/board-context';
import { Column } from './pieces/column';
import { createRegistry } from './pieces/registry';
import General from './pieces/general';

export default function BoardExample() {
	const [data, setData] = useState<BoardState>(getInitialBoardState);

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
				`You've moved ${sourceColumn.columnId} from position ${
					startIndex + 1
				} to position ${finishIndex + 1} of ${orderedColumnIds.length}.`,
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
				`You've moved ${item.name} from position ${
					startIndex + 1
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
				`You've moved ${item.name} from position ${
					itemIndexInStartColumn + 1
				} to position ${finishPosition} in the ${destinationColumn.columnId} column.`,
			);

			/**
			 * Because the card has moved column, it will have remounted.
			 * This means we need to manually restore focus to it.
			 */
			entry.actionMenuTrigger.focus();

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

				const updatedSourceColumn: ColumnData = {
					...sourceColumn,
					items: updatedItems,
				};

				const updatedMap: ColumnMap = {
					...data.columnMap,
					[columnId]: updatedSourceColumn,
				};

				const outcome: Outcome | null = {
					type: 'card-reorder',
					columnId,
					startIndex,
					finishIndex,
				};

				return {
					...data,
					columnMap: updatedMap,
					lastOperation: {
						trigger: trigger,
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

				const destinationItems = Array.from(destinationColumn.items);
				// Going into the first position if no index is provided
				const newIndexInDestination = itemIndexInFinishColumn ?? 0;
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
				const destinationItems = Array.from(destinationColumn.items);
				// Going into the first position if no index is provided
				const newIndexInDestination = itemIndexInFinishColumn ?? 0;
				console.log(newIndexInDestination);
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

	const [instanceId] = useState(() => Symbol('instance-id'));

	useEffect(() => {
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
						// dropping in a column (on its header)
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
					files.forEach((file) => {
						if (file == null) {
							return;
						}
						if (!file.type.startsWith('image/')) {
							return;
						}

						const cardId = `id:${getNextCardId()}`;
						const reader = new FileReader();
						reader.readAsDataURL(file);
						const unbind: UnbindFn = bind(reader, {
							type: 'load',
							listener: (_) => {
								const result = reader.result;
								if (typeof result === 'string') {
									insertCard({
										item: {
											type: 'image-card',
											cardId,
											name: file.name,
											contentUrl: result,
											offset: { x: 0, y: 0 },
										},
										finishColumnId,
										itemIndexInFinishColumn,
										trigger,
									});
								} else {
									console.error('Invalid type of FileReader result');
								}
								unbind();
							},
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
		);
	}, [data, instanceId, moveCard, insertCard, reorderCard, reorderColumn]);

	const contextValue: BoardContextValue = useMemo(() => {
		return {
			getColumns,
			reorderColumn,
			reorderCard,
			moveCard,
			insertCard,
			registerCard: registry.registerCard,
			registerColumn: registry.registerColumn,
			instanceId,
		};
	}, [getColumns, reorderColumn, reorderCard, registry, moveCard, insertCard, instanceId]);

	return (
		<BoardContext.Provider value={contextValue}>
			<General {...data} />
			<hr style={{ color: 'gray' }} />
			<Board>
				{data.orderedColumnIds.map((columnId) => {
					return <Column column={data.columnMap[columnId]} key={columnId} />;
				})}
			</Board>
		</BoardContext.Provider>
	);
}

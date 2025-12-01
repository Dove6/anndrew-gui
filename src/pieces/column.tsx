import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createPortal } from 'react-dom';
import invariant from 'tiny-invariant';

import { IconButton } from '@atlaskit/button/new';
import DropdownMenu, {
	type CustomTriggerProps,
	DropdownItem,
	DropdownItemGroup,
} from '@atlaskit/dropdown-menu';
// eslint-disable-next-line @atlaskit/design-system/no-banned-imports
import mergeRefs from '@atlaskit/ds-lib/merge-refs';
import Heading from '@atlaskit/heading';
// This is the smaller MoreIcon soon to be more easily accessible with the
// ongoing icon project
import MoreIcon from '@atlaskit/icon/core/migration/show-more-horizontal--editor-more';
import { easeInOut } from '@atlaskit/motion/curves';
import { durations } from '@atlaskit/motion/durations';
import { fg } from '@atlaskit/platform-feature-flags';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import {
	attachClosestEdge,
	type Edge,
	extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
	draggable,
	dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { dropTargetForExternal } from '@atlaskit/pragmatic-drag-and-drop/external/adapter';
import { centerUnderPointer } from '@atlaskit/pragmatic-drag-and-drop/element/center-under-pointer';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { containsFiles } from '@atlaskit/pragmatic-drag-and-drop/external/file';
// eslint-disable-next-line @atlaskit/design-system/no-emotion-primitives -- to be migrated to @atlaskit/primitives/compiled – go/akcss
import { Box, Flex, Inline, Stack, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';

import { type ColumnData } from '../models';

import { useBoardContext } from './board-context';
import { Card } from './card';
import { ColumnContext, type ColumnContextProps, useColumnContext } from './column-context';
import Textfield from '@atlaskit/textfield';
import { mod, parseOpacity, stringifyOpacity, toInteger } from '../sanitization';
import { blurOnEnterDown } from '../eventHandling';

const frameColumnStyles = xcss({
	width: '250px',
	minWidth: '250px',
	maxWidth: '250px',
	backgroundColor: 'elevation.surface.sunken',
	borderRadius: 'radius.xlarge',
	// eslint-disable-next-line @atlaskit/ui-styling-standard/no-unsafe-values, @atlaskit/ui-styling-standard/no-imported-style-values
	transition: `background ${durations.medium}ms ${easeInOut}`,
	position: 'relative',
	/**
	 * TODO: figure out hover color.
	 * There is no `elevation.surface.sunken.hovered` token,
	 * so leaving this for now.
	 */
});

const imageColumnStyles = xcss({
	width: '300px',
	minWidth: '300px',
	maxWidth: '300px',
	backgroundColor: 'color.background.discovery',
	borderRadius: 'radius.xlarge',
	// eslint-disable-next-line @atlaskit/ui-styling-standard/no-unsafe-values, @atlaskit/ui-styling-standard/no-imported-style-values
	transition: `background ${durations.medium}ms ${easeInOut}`,
	position: 'relative',
	/**
	 * TODO: figure out hover color.
	 * There is no `elevation.surface.sunken.hovered` token,
	 * so leaving this for now.
	 */
});

const stackStyles = xcss({
	// allow the container to be shrunk by a parent height
	// https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/#the-minimum-size-gotcha-11
	minHeight: '0',

	// ensure our card list grows to be all the available space
	// so that users can easily drop on en empty list
	flexGrow: 1,
});

const scrollContainerStyles = xcss({
	height: '100%',
	overflowY: 'auto',
});

const cardListStyles = xcss({
	boxSizing: 'border-box',
	minHeight: '100%',
	padding: 'space.100',
	gap: 'space.100',
});

const columnHeaderStyles = xcss({
	paddingInlineStart: 'space.200',
	paddingInlineEnd: 'space.200',
	paddingBlockStart: 'space.100',
	color: 'color.text.subtlest',
	userSelect: 'none',
});

const propertiesHeaderStyles = xcss({
	paddingInlineStart: 'space.200',
	paddingInlineEnd: 'space.200',
	color: 'color.text.subtlest',
	userSelect: 'none',
});

/**
 * Note: not making `'is-dragging'` a `State` as it is
 * a _parallel_ state to `'is-column-over'`.
 *
 * Our board allows you to be over the column that is currently dragging
 */
type State =
	| { type: 'idle' }
	| { type: 'is-card-over' }
	| { type: 'is-column-over'; closestEdge: Edge | null }
	| { type: 'generate-safari-column-preview'; container: HTMLElement }
	| { type: 'generate-column-preview' };

// preventing re-renders with stable state objects
const idle: State = { type: 'idle' };
const isCardOver: State = { type: 'is-card-over' };

const draggableStateStyles: {
	[key in State['type']]: ReturnType<typeof xcss> | undefined;
} = {
	idle: xcss({
		cursor: 'grab',
	}),
	'is-card-over': xcss({
		backgroundColor: 'color.background.selected.hovered',
	}),
	'is-column-over': undefined,
	/**
	 * **Browser bug workaround**
	 *
	 * _Problem_
	 * When generating a drag preview for an element
	 * that has an inner scroll container, the preview can include content
	 * vertically before or after the element
	 *
	 * _Fix_
	 * We make the column a new stacking context when the preview is being generated.
	 * We are not making a new stacking context at all times, as this _can_ mess up
	 * other layering components inside of your card
	 *
	 * _Fix: Safari_
	 * We have not found a great workaround yet. So for now we are just rendering
	 * a custom drag preview
	 */
	'generate-column-preview': xcss({
		isolation: 'isolate',
	}),
	'generate-safari-column-preview': undefined,
};

const nonDraggableStateStyles: {
	[key in State['type']]: ReturnType<typeof xcss> | undefined;
} = {
	idle: undefined,
	'is-card-over': xcss({
		backgroundColor: 'color.background.selected.hovered',
	}),
	'is-column-over': undefined,
	'generate-column-preview': undefined,
	'generate-safari-column-preview': undefined,
};

const isDraggingStyles = xcss({
	opacity: 0.4,
});

export const Column = ({ column, order }: { column: ColumnData, order: number }) => {
	const columnId = column.columnId;
	const isImageColumn = column.type === 'image-column';
	const isDraggable = !isImageColumn;
	const columnRef = useRef<HTMLDivElement | null>(null);
	const columnInnerRef = useRef<HTMLDivElement | null>(null);
	const headerRef = useRef<HTMLDivElement | null>(null);
	const scrollableRef = useRef<HTMLDivElement | null>(null);
	const [state, setState] = useState<State>(idle);
	const [isDragging, setIsDragging] = useState<boolean>(false);

	const { instanceId, registerColumn, updateColumn, getColumns } = useBoardContext();

	useEffect(() => {
		invariant(columnRef.current);
		invariant(columnInnerRef.current);
		invariant(headerRef.current);
		invariant(scrollableRef.current);
		const fnList = [
			registerColumn({
				columnId,
				entry: {
					element: columnRef.current,
				},
			}),
			dropTargetForExternal({
				element: columnInnerRef.current,
				getData: () => ({ columnId }),
				canDrop: ({ source }) => column.type === 'image-column' && containsFiles({ source }),
				getIsSticky: () => true,
				onDragEnter: () => setState(isCardOver),
				onDragLeave: () => setState(idle),
				onDrop: () => setState(idle),
			}),
			dropTargetForElements({
				element: columnInnerRef.current,
				getData: () => ({ columnId }),
				canDrop: ({ source }) => {
					return source.data.instanceId === instanceId && source.data.type === 'card' && (source.data.subtype === 'image-card' || column.type === 'event-column');
				},
				getIsSticky: () => true,
				onDragEnter: () => setState(isCardOver),
				onDragLeave: () => setState(idle),
				onDragStart: () => setState(isCardOver),
				onDrop: () => setState(idle),
			}),
			dropTargetForElements({
				element: columnRef.current,
				canDrop: ({ source }) => {
					return source.data.instanceId === instanceId && source.data.type === 'column' && (source.data.subtype === 'image-column' || column.type === 'event-column');
				},
				getIsSticky: () => true,
				getData: ({ input, element }) => {
					const data = {
						columnId,
					};
					return attachClosestEdge(data, {
						input,
						element,
						allowedEdges: ['left', 'right'],
					});
				},
				onDragEnter: (args) => {
					setState({
						type: 'is-column-over',
						closestEdge: extractClosestEdge(args.self.data),
					});
				},
				onDrag: (args) => {
					// skip react re-render if edge is not changing
					setState((current) => {
						const closestEdge: Edge | null = extractClosestEdge(args.self.data);
						if (current.type === 'is-column-over' && current.closestEdge === closestEdge) {
							return current;
						}
						return {
							type: 'is-column-over',
							closestEdge,
						};
					});
				},
				onDragLeave: () => setState(idle),
				onDrop: () => setState(idle),
			}),
			autoScrollForElements({
				element: scrollableRef.current,
				canScroll: ({ source }) =>
					source.data.instanceId === instanceId && source.data.type === 'card',
			})];
		if (isDraggable) {
			fnList.splice(1, 0, draggable({
				element: columnRef.current,
				dragHandle: headerRef.current,
				getInitialData: () => ({ columnId, type: 'column', subtype: column.type, instanceId }),
				onGenerateDragPreview: ({ nativeSetDragImage }) => {
					const isSafari: boolean =
						navigator.userAgent.includes('AppleWebKit') && !navigator.userAgent.includes('Chrome');

					if (!isSafari) {
						setState({ type: 'generate-column-preview' });
						return;
					}
					setCustomNativeDragPreview({
						getOffset: centerUnderPointer,
						render: ({ container }) => {
							setState({
								type: 'generate-safari-column-preview',
								container,
							});
							return () => setState(idle);
						},
						nativeSetDragImage,
					});
				},
				onDragStart: () => {
					setIsDragging(true);
				},
				onDrop() {
					setState(idle);
					setIsDragging(false);
				},
			}));
		}
		return combine(...fnList);
	}, [columnId, registerColumn, instanceId, isDraggable]);

	const stableItems = useRef(column.items);
	useEffect(() => {
		stableItems.current = column.items;
	}, [column.items]);

	const getCardIndex = useCallback((cardId: string) => {
		return stableItems.current.findIndex((item) => item.cardId === cardId);
	}, []);

	const getNumCards = useCallback(() => {
		return stableItems.current.length;
	}, []);

	const contextValue: ColumnContextProps = useMemo(() => {
		return { columnId, getCardIndex, getNumCards };
	}, [columnId, getCardIndex, getNumCards]);

	const columnStyles = isImageColumn ? imageColumnStyles : frameColumnStyles;
	const stateStyles = isDraggable ? draggableStateStyles : nonDraggableStateStyles;
	const title = isImageColumn ? 'Images' : `Event ${order}: ${column.name}`;

	return (
		<ColumnContext.Provider value={contextValue}>
			<Flex
				testId={`column-${columnId}`}
				ref={columnRef}
				direction="column"
				xcss={[columnStyles, stateStyles[state.type]]}
			>
				{/* This element takes up the same visual space as the column.
				We are using a separate element so we can have two drop targets
				that take up the same visual space (one for cards, one for columns)
				*/}
				<Stack xcss={stackStyles} ref={columnInnerRef}>
					<Stack xcss={[stackStyles, isDragging ? isDraggingStyles : undefined]}>
						<Stack ref={headerRef}>
							<Inline
								space="space.100"
								xcss={columnHeaderStyles}
								testId={`column-header-${columnId}`}
								spread="space-between"
								alignBlock="center"
							>
								<Heading size="xxsmall" as="span" testId={`column-header-title-${columnId}`} ref={(ref) => {
									if (!ref) {
										return;
									}
									ref.style.whiteSpace = 'nowrap';
									ref.style.overflow = 'hidden';
								}}>
									{title}
								</Heading>
								{!isImageColumn ? <ActionMenu /> : <></>}
							</Inline>
							{isImageColumn
								? <></>
								: <Stack space="space.0" grow="fill" xcss={propertiesHeaderStyles}>
									<Inline alignBlock="baseline" xcss={xcss({ fontSize: 'small' })}>
										<span>Name:</span>
										<Textfield
											appearance="subtle"
											placeholder="Image name"
											defaultValue={column.name}
											onKeyDown={blurOnEnterDown}
											onBlur={e => {
												const name = e.currentTarget.value;
												for (const event of getColumns()) {
													if (event.columnId === columnId || event.type === 'image-column' || (event.type === 'event-column' && event.name !== name)) {
														continue;
													}
													alert('Event name must be unique!');
													e.currentTarget.focus();
													return;
												}
												if (name.indexOf(' ') >= 0) {
													alert('Event name must not contain spaces!');
													e.currentTarget.focus();
													return;
												}
												updateColumn({ columnId, columnUpdate: { type: 'event-column', name } });
												e.currentTarget.setSelectionRange(0, 0);
											}}
											style={{ paddingBlock: '1px', fontSize: 'small', pointerEvents: 'none' }}
										/>
									</Inline>
									<Inline alignBlock="baseline" xcss={xcss({ fontSize: 'small' })}>
										<span>Opacity:</span>
										<Textfield
											appearance="subtle"
											defaultValue={stringifyOpacity(column.opacity)}
											onKeyDown={blurOnEnterDown}
											onBlur={e => {
												const validatedValue = parseOpacity(e.currentTarget.value);
												e.currentTarget.value = stringifyOpacity(validatedValue);
												updateColumn({ columnId, columnUpdate: { type: 'event-column', opacity: validatedValue } });
												e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
											}}
											style={{ paddingBlock: '1px', paddingInlineEnd: '0', fontSize: 'small', pointerEvents: 'none', textAlign: 'right', width: '100%' }}
											ref={(ref: HTMLElement) => {
												if (!ref) {
													return;
												}
												ref.parentElement!.style.maxWidth = '3em';
												ref.parentElement!.style.minWidth = '3em';
												ref.parentElement!.style.width = '3em';
											}}
										/>
										<span>%</span>
										<span style={{ marginRight: '10px' }}></span>
										<span>Loop length:</span>
										<Textfield
											appearance="subtle"
											defaultValue={column.loopLength}
											onKeyDown={blurOnEnterDown}
											onBlur={e => {
												const validatedValue = mod(toInteger(e.currentTarget.value), column.items.length);
												e.currentTarget.value = String(validatedValue);
												updateColumn({ columnId, columnUpdate: { type: 'event-column', loopLength: validatedValue } });
												e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
											}}
											style={{ paddingBlock: '1px', fontSize: 'small', pointerEvents: 'none', textAlign: 'right', width: '100%' }}
											ref={(ref: HTMLElement) => {
												if (!ref) {
													return;
												}
												ref.parentElement!.style.maxWidth = '2.5em';
												ref.parentElement!.style.minWidth = '2.5em';
												ref.parentElement!.style.width = '2.5em';
											}}
										/>
									</Inline>
								</Stack>}
						</Stack>
						<hr style={{ width: '93%', color: 'lightgray' }} />
						<Box xcss={scrollContainerStyles} ref={scrollableRef}>
							<Stack xcss={cardListStyles} space="space.100">
								{column.items.map((item, order) => (
									<Card item={item} order={order} key={item.cardId} />
								))}
							</Stack>
						</Box>
					</Stack>
				</Stack>
				{state.type === 'is-column-over' && state.closestEdge && (
					<DropIndicator edge={state.closestEdge} gap={token('space.200', '0')} />
				)}
			</Flex>
			{state.type === 'generate-safari-column-preview'
				? createPortal(<SafariColumnPreview column={column} />, state.container)
				: null}
		</ColumnContext.Provider>
	);
};

const safariPreviewStyles = xcss({
	width: '250px',
	backgroundColor: 'elevation.surface.sunken',
	borderRadius: 'radius.small',
	padding: 'space.200',
});

function SafariColumnPreview({ column }: { column: ColumnData }) {
	return (
		<Box xcss={[columnHeaderStyles, safariPreviewStyles]}>
			<Heading size="xxsmall" as="span">
				{column.columnId}
			</Heading>
		</Box>
	);
}

function ActionMenu() {
	return (
		<DropdownMenu
			trigger={DropdownMenuTrigger}
			shouldRenderToParent={fg('should-render-to-parent-should-be-true-design-syst')}
		>
			<ActionMenuItems />
		</DropdownMenu>
	);
}

function ActionMenuItems() {
	const { columnId } = useColumnContext();
	const { getColumns, reorderColumn, removeColumn } = useBoardContext();

	const columns = getColumns();
	const startIndex = columns.findIndex((column) => column.columnId === columnId);
	const currentColumn = columns[startIndex];
	const isImageColumn = currentColumn.type === 'image-column';

	const moveLeft = useCallback(() => {
		reorderColumn({
			startIndex,
			finishIndex: startIndex - 1,
		});
	}, [reorderColumn, startIndex]);

	const moveRight = useCallback(() => {
		reorderColumn({
			startIndex,
			finishIndex: startIndex + 1,
		});
	}, [reorderColumn, startIndex]);

	const removeCurrent = useCallback(() => {
		removeColumn({
			startIndex,
		});
	}, [removeColumn, startIndex]);

	const isMoveLeftDisabled = startIndex === 0 || columns[startIndex - 1].type === 'image-column';
	const isMoveRightDisabled = startIndex === columns.length - 1;
	const isRemoveCurrentDisabled = isImageColumn;

	return (
		<DropdownItemGroup>
			<DropdownItem onClick={moveLeft} isDisabled={isMoveLeftDisabled}>
				Move left
			</DropdownItem>
			<DropdownItem onClick={moveRight} isDisabled={isMoveRightDisabled}>
				Move right
			</DropdownItem>
			<DropdownItem onClick={removeCurrent} isDisabled={isRemoveCurrentDisabled}>
				Remove
			</DropdownItem>
		</DropdownItemGroup>
	);
}

function DropdownMenuTrigger({ triggerRef, ...triggerProps }: CustomTriggerProps) {
	return (
		<IconButton
			ref={mergeRefs([triggerRef])}
			appearance="subtle"
			label="Actions"
			spacing="compact"
			icon={(iconProps) => <MoreIcon {...iconProps} size="small" />}
			{...triggerProps}
		/>
	);
}

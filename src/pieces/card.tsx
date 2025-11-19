import {
	forwardRef,
	Fragment,
	type Ref,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';

import ReactDOM from 'react-dom';
import invariant from 'tiny-invariant';

import Avatar from '@atlaskit/avatar';
import Textfield from '@atlaskit/textfield';
import UploadIcon from '@atlaskit/icon/core/upload';
import LinkExternalIcon from '@atlaskit/icon/core/link-external';
import { IconButton } from '@atlaskit/button/new';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
// eslint-disable-next-line @atlaskit/design-system/no-banned-imports
import mergeRefs from '@atlaskit/ds-lib/merge-refs';
import Heading from '@atlaskit/heading';
// This is the smaller MoreIcon soon to be more easily accessible with the
// ongoing icon project
import MoreIcon from '@atlaskit/icon/core/migration/show-more-horizontal--editor-more';
import { fg } from '@atlaskit/platform-feature-flags';
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
import { containsFiles } from '@atlaskit/pragmatic-drag-and-drop/external/file';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { dropTargetForExternal } from '@atlaskit/pragmatic-drag-and-drop/external/adapter';
// eslint-disable-next-line @atlaskit/design-system/no-emotion-primitives -- to be migrated to @atlaskit/primitives/compiled – go/akcss
import { Box, Grid, Inline, Stack, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';

import { type CardData, type ImageCard, type FrameCard, type EventColumn } from '../models';

import { useBoardContext } from './board-context';
import { useColumnContext } from './column-context';
import { Jimp } from 'jimp';

type State =
	| { type: 'idle' }
	| { type: 'preview'; container: HTMLElement; rect: DOMRect }
	| { type: 'dragging' };

const idleState: State = { type: 'idle' };
const draggingState: State = { type: 'dragging' };

const noPointerEventsStyles = xcss({ pointerEvents: 'none' });
const relativePositionStyle = xcss({ position: 'relative' });
const baseStyles = xcss({
	width: '100%',
	padding: 'space.100',
	paddingRight: 'space.0',
	backgroundColor: 'elevation.surface',
	borderRadius: 'radius.large',
	position: 'relative',
	':hover': {
		backgroundColor: 'elevation.surface.hovered',
	},
});

const imageBaseStyles = xcss({
	width: '100%',
	padding: 'space.100',
	paddingRight: 'space.0',
	backgroundColor: 'color.background.danger',
	borderRadius: 'radius.large',
	position: 'relative',
	':hover': {
		backgroundColor: 'color.background.danger.hovered',
	},
});

const stateStyles: {
	[Key in State['type']]: ReturnType<typeof xcss> | undefined;
} = {
	idle: xcss({
		cursor: 'grab',
		boxShadow: 'elevation.shadow.raised',
	}),
	dragging: xcss({
		opacity: 0.4,
		boxShadow: 'elevation.shadow.raised',
	}),
	// no shadow for preview - the platform will add it's own drop shadow
	preview: undefined,
};

const swapImageButtonStyle = xcss({
	pointerEvents: 'all',
	position: 'absolute',
	top: 'space.050',
	right: 'space.050',
});

type CardPrimitiveProps = {
	closestEdge: Edge | null;
	item: CardData;
	order: number;
	state: State;
	actionMenuTriggerRef?: Ref<HTMLButtonElement>;
};

type ImageCardPrimitiveProps = {
	closestEdge: Edge | null;
	item: ImageCard;
	order: number;
	state: State;
	cardDivRef: Ref<HTMLDivElement>;
	actionMenuTriggerRef?: Ref<HTMLButtonElement>;
};

type FrameCardPrimitiveProps = {
	closestEdge: Edge | null;
	item: FrameCard;
	order: number;
	state: State;
	cardDivRef: Ref<HTMLDivElement>;
	actionMenuTriggerRef?: Ref<HTMLButtonElement>;
};

function MoveToOtherColumnItem({
	targetColumn,
	startIndex,
}: {
	targetColumn: EventColumn;
	startIndex: number;
}) {
	const { moveCard, getColumns } = useBoardContext();
	const { columnId } = useColumnContext();

	const onClick = useCallback(() => {
		moveCard({
			startColumnId: columnId,
			finishColumnId: targetColumn.columnId,
			itemIndexInStartColumn: startIndex,
		});
	}, [columnId, moveCard, startIndex, targetColumn.columnId]);

	return <DropdownItem onClick={onClick}>
		{`Event ${getColumns().filter(c => c.type === 'event-column').findIndex(c => c.columnId === targetColumn.columnId)}: ${targetColumn.name}`}
	</DropdownItem>;
}

function LazyDropdownItems({ cardId }: { cardId: string }) {
	const { getColumns, reorderCard, removeCard } = useBoardContext();
	const { columnId, getCardIndex, getNumCards } = useColumnContext();

	const numCards = getNumCards();
	const startIndex = getCardIndex(cardId);

	const moveToTop = useCallback(() => {
		reorderCard({ columnId, startIndex, finishIndex: 0 });
	}, [columnId, reorderCard, startIndex]);

	const moveUp = useCallback(() => {
		reorderCard({ columnId, startIndex, finishIndex: startIndex - 1 });
	}, [columnId, reorderCard, startIndex]);

	const moveDown = useCallback(() => {
		reorderCard({ columnId, startIndex, finishIndex: startIndex + 1 });
	}, [columnId, reorderCard, startIndex]);

	const moveToBottom = useCallback(() => {
		reorderCard({ columnId, startIndex, finishIndex: numCards - 1 });
	}, [columnId, reorderCard, startIndex, numCards]);

	const remove = useCallback(() => {
		removeCard({ startColumnId: columnId, itemIndexInStartColumn: startIndex });
	}, [columnId, removeCard, startIndex]);

	const isMoveUpDisabled = startIndex === 0;
	const isMoveDownDisabled = startIndex === numCards - 1;

	const columns = getColumns();
	const currentColumn = columns.find(column => column.columnId === columnId);
	invariant(currentColumn);
	const moveColumnOptions = columns
		.filter(column => column.columnId !== columnId)
		.filter(column => column.type !== 'image-column');

	const moveColumnHeader = currentColumn.type === 'image-column' ? 'Copy to' : 'Move to';

	return (
		<Fragment>
			<DropdownItem onClick={remove}>
				Remove
			</DropdownItem>
			<DropdownItemGroup title="Reorder">
				<DropdownItem onClick={moveToTop} isDisabled={isMoveUpDisabled}>
					Move to top
				</DropdownItem>
				<DropdownItem onClick={moveUp} isDisabled={isMoveUpDisabled}>
					Move up
				</DropdownItem>
				<DropdownItem onClick={moveDown} isDisabled={isMoveDownDisabled}>
					Move down
				</DropdownItem>
				<DropdownItem onClick={moveToBottom} isDisabled={isMoveDownDisabled}>
					Move to bottom
				</DropdownItem>
			</DropdownItemGroup>
			{moveColumnOptions.length ? (
				<DropdownItemGroup title={moveColumnHeader}>
					{moveColumnOptions.map((column) => (
						<MoveToOtherColumnItem
							key={column.columnId}
							targetColumn={column}
							startIndex={startIndex}
						/>
					))}
				</DropdownItemGroup>
			) : null}
		</Fragment>
	);
}

const CardPrimitive = forwardRef<HTMLDivElement, CardPrimitiveProps>(function CardPrimitive({ closestEdge, item, order, state, actionMenuTriggerRef }, ref) {
	switch (item.type) {
		case 'image-card':
			return <ImageCardPrimitive closestEdge={closestEdge} item={item} order={order} state={state} actionMenuTriggerRef={actionMenuTriggerRef} cardDivRef={ref} />;
		default:
			return <FrameCardPrimitive closestEdge={closestEdge} item={item} order={order} state={state} actionMenuTriggerRef={actionMenuTriggerRef} cardDivRef={ref} />;
	}
});

const ImageCardPrimitive = (
	{ closestEdge, item, order, state, actionMenuTriggerRef, cardDivRef }: ImageCardPrimitiveProps,
) => {
	const { cardId, name, contentUrl, offset } = item;
	const title = `Image ${order}: ${name}`;
	const { updateCard } = useBoardContext();
	const { columnId } = useColumnContext();
	const uploaderRef = useRef<HTMLInputElement | null>(null);
	return (
		<Grid
			ref={cardDivRef}
			testId={`item-${cardId}`}
			templateColumns="auto 1fr auto"
			columnGap="space.100"
			xcss={[imageBaseStyles, stateStyles[state.type]]}
		>
			<Box as="span" xcss={[noPointerEventsStyles, relativePositionStyle]}>
				<Avatar
					size="xlarge"
					appearance="square"
					borderColor="white"
					src={contentUrl}
					ref={ref => {
						if (!ref) {
							return;
						}
						ref.style.borderColor = token('color.background.accent.gray.subtle');
						ref.style.borderStyle = 'solid';
						ref.style.borderWidth = '1px';
					}}
				/>
				<Box xcss={swapImageButtonStyle}>
					<IconButton
						icon={(iconProps) => <UploadIcon {...iconProps} size="small" />}
						label="Replace image from disk"
						isTooltipDisabled={false}
						appearance="primary"
						spacing="compact"
						onClick={_ => {
							const input = uploaderRef.current;
							if (!input) {
								return;
							}
							input.oncancel = () => {
								input.oncancel = null;
								input.onchange = null;
							};
							input.onchange = async () => {
								input.oncancel = null;
								input.onchange = null;
								if (input.files?.length !== 1) {
									return;
								}
								const file = input.files[0];
								if (!file.type.startsWith('image/')) {
									console.error('Not an image');
									return;
								}

								const buffer = await file.arrayBuffer();
								const image = await Jimp.read(buffer);
								const contentUrl = await image.getBase64('image/png');
								updateCard({ columnId, cardId, cardUpdate: { type: 'image-card', contentUrl } });
							};
							input.click();
						}}
					/>
					<input type="file" ref={uploaderRef} style={{ display: 'none' }} />
				</Box>
			</Box>

			<Stack space="space.0" grow="fill" xcss={xcss({ overflow: 'hidden' })}>
				<Inline space="space.100" alignBlock="center" spread="space-between" xcss={xcss({ fontSize: 'small' })}>
					<Heading size="xsmall" as="span" ref={(ref) => {
						if (!ref) {
							return;
						}
						ref.style.whiteSpace = 'nowrap';
						ref.style.overflow = 'hidden';
					}}>
						{title}
					</Heading>
					<DropdownMenu
						trigger={({ triggerRef, ...triggerProps }) => (
							<IconButton
								ref={
									actionMenuTriggerRef
										? mergeRefs([triggerRef, actionMenuTriggerRef])
										: // Workaround for IconButton typing issue
										mergeRefs([triggerRef])
								}
								icon={(iconProps) => <MoreIcon {...iconProps} size="small" />}
								label={`Move ${name}`}
								appearance="default"
								spacing="compact"

								{...triggerProps}
							/>
						)}
						shouldRenderToParent={fg('should-render-to-parent-should-be-true-design-syst')}
					>
						<LazyDropdownItems cardId={cardId} />
					</DropdownMenu>
				</Inline>
				<Inline alignBlock="baseline" xcss={xcss({ fontSize: 'small' })}>
					<span>Name:</span>
					<Textfield
						appearance="subtle"
						placeholder="Image name"
						value={name}
						onChange={e => updateCard({ columnId, cardId, cardUpdate: { type: 'image-card', name: e.currentTarget.value } })}
						onBlur={e => e.currentTarget.setSelectionRange(0, 0)}
						style={{ paddingBlock: '1px', fontSize: 'small', pointerEvents: 'none' }}
					/>
				</Inline>
				<Inline alignBlock="baseline" xcss={xcss({ fontSize: 'small' })}>
					<span>Offset:</span>
					<Textfield
						appearance="subtle"
						defaultValue={offset.x}
						onBlur={e => {
							const validatedValue = Math.round(Number(e.currentTarget.value));
							e.currentTarget.value = String(validatedValue);
							updateCard({ columnId, cardId, cardUpdate: { type: 'image-card', offsetX: validatedValue } });
							e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
						}}
						style={{ paddingBlock: '1px', fontSize: 'small', pointerEvents: 'none', textAlign: 'right', width: '100%' }}
						ref={(ref: HTMLElement) => {
							if (!ref) {
								return;
							}
							ref.parentElement!.style.maxWidth = '3.5em';
							ref.parentElement!.style.minWidth = '2em';
							ref.parentElement!.style.width = '3.5em';
						}}
					/>
					<span>x</span>
					<Textfield
						appearance="subtle"
						defaultValue={offset.y}
						onBlur={e => {
							const validatedValue = Math.round(Number(e.currentTarget.value));
							e.currentTarget.value = String(validatedValue);
							updateCard({ columnId, cardId, cardUpdate: { type: 'image-card', offsetY: validatedValue } });
							e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
						}}
						style={{ paddingBlock: '1px', fontSize: 'small', pointerEvents: 'none', textAlign: 'right', width: '100%' }}
						ref={(ref: HTMLElement) => {
							if (!ref) {
								return;
							}
							ref.parentElement!.style.maxWidth = '3.5em';
							ref.parentElement!.style.minWidth = '2em';
							ref.parentElement!.style.width = '3.5em';
						}}
					/>
					<span>px</span>
				</Inline>
			</Stack>
			{closestEdge && <DropIndicator edge={closestEdge} gap={token('space.100', '0')} />}
		</Grid>
	);
};

const FrameCardPrimitive = (
	{ closestEdge, item, order, state, actionMenuTriggerRef, cardDivRef }: FrameCardPrimitiveProps,
) => {
	const { cardId, name, imageRef, offset, sfx, opacity } = item;
	const { getColumns, flashCard, updateCard } = useBoardContext();
	const { columnId } = useColumnContext();
	const title = `Frame ${order}: ${name}`;
	const imageRefColumn = getColumns().find(c => c.items.findIndex(i => i.cardId == imageRef.cardId) >= 0);
	invariant(imageRefColumn);
	const refImageTitle = `Image ${imageRefColumn.items.findIndex(i => i.cardId == imageRef.cardId)}: ${imageRef.name}`;

	return (
		<Grid
			ref={cardDivRef}
			testId={`item-${cardId}`}
			templateColumns="auto 1fr auto"
			columnGap="space.100"
			xcss={[baseStyles, stateStyles[state.type]]}
		>
			<Stack space="space.050" grow="fill" alignInline="center" xcss={xcss({ overflow: 'hidden' })}>
				<Box as="span" xcss={noPointerEventsStyles}>
					<Avatar
						size="large"
						appearance="square"
						borderColor="white"
						src={imageRef.contentUrl}
						ref={ref => {
							if (!ref) {
								return;
							}
							ref.style.borderColor = token('color.background.accent.gray.subtle');
							ref.style.borderStyle = 'solid';
							ref.style.borderWidth = '1px';
						}}
					/>
				</Box>
				<IconButton
					icon={LinkExternalIcon}
					label={<div style={{ textAlign: 'center' }}>
						<span>Highlight reference image</span>
						<br />
						<span>{refImageTitle}</span>
					</div>}
					isTooltipDisabled={false}
					onClick={() => flashCard({ cardId: imageRef.cardId })}
				/>
			</Stack>

			<Stack space="space.0" grow="fill" xcss={xcss({ overflow: 'hidden' })}>
				<Inline space="space.100" alignBlock="center" spread="space-between" xcss={xcss({ fontSize: 'small' })}>
					<Heading size="xsmall" as="span" ref={(ref) => {
						if (!ref) {
							return;
						}
						ref.style.whiteSpace = 'nowrap';
						ref.style.overflow = 'hidden';
					}}>
						{title}
					</Heading>
					<DropdownMenu
						trigger={({ triggerRef, ...triggerProps }) => (
							<IconButton
								ref={
									actionMenuTriggerRef
										? mergeRefs([triggerRef, actionMenuTriggerRef])
										: // Workaround for IconButton typing issue
										mergeRefs([triggerRef])
								}
								icon={(iconProps) => <MoreIcon {...iconProps} size="small" />}
								label={`Move ${name}`}
								appearance="default"
								spacing="compact"
								{...triggerProps}
							/>
						)}
						shouldRenderToParent={fg('should-render-to-parent-should-be-true-design-syst')}
					>
						<LazyDropdownItems cardId={cardId} />
					</DropdownMenu>
				</Inline>
				<Inline alignBlock="baseline" xcss={xcss({ fontSize: 'small' })}>
					<span>Name:</span>
					<Textfield
						appearance="subtle"
						placeholder="Frame name"
						value={name}
						onChange={e => updateCard({ columnId, cardId, cardUpdate: { type: 'frame-card', name: e.currentTarget.value } })}
						onBlur={e => e.currentTarget.setSelectionRange(0, 0)}
						style={{ paddingBlock: '1px', fontSize: 'small', pointerEvents: 'none' }}
					/>
				</Inline>
				<Inline alignBlock="baseline" xcss={xcss({ fontSize: 'small' })}>
					<span>Offset:</span>
					<Textfield
						appearance="subtle"
						defaultValue={offset.x}
						onBlur={e => {
							const validatedValue = Math.round(Number(e.currentTarget.value));
							e.currentTarget.value = String(validatedValue);
							updateCard({ columnId, cardId, cardUpdate: { type: 'frame-card', offsetX: validatedValue } });
							e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
						}}
						style={{ paddingBlock: '1px', fontSize: 'small', pointerEvents: 'none', textAlign: 'right', width: '100%' }}
						ref={(ref: HTMLElement) => {
							if (!ref) {
								return;
							}
							ref.parentElement!.style.maxWidth = '3.5em';
							ref.parentElement!.style.minWidth = '2em';
							ref.parentElement!.style.width = '3.5em';
						}}
					/>
					<span>x</span>
					<Textfield
						appearance="subtle"
						defaultValue={offset.y}
						onBlur={e => {
							const validatedValue = Math.round(Number(e.currentTarget.value));
							e.currentTarget.value = String(validatedValue);
							updateCard({ columnId, cardId, cardUpdate: { type: 'frame-card', offsetY: validatedValue } });
							e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
						}}
						style={{ paddingBlock: '1px', fontSize: 'small', pointerEvents: 'none', textAlign: 'right', width: '100%' }}
						ref={(ref: HTMLElement) => {
							if (!ref) {
								return;
							}
							ref.parentElement!.style.maxWidth = '3.5em';
							ref.parentElement!.style.minWidth = '2em';
							ref.parentElement!.style.width = '3.5em';
						}}
					/>
					<span>px</span>
				</Inline>
				<Inline alignBlock="baseline" xcss={xcss({ fontSize: 'small' })}>
					<span>Opacity:</span>
					<Textfield
						appearance="subtle"
						defaultValue={opacity}
						onBlur={e => {
							const validatedValue = Math.min(255, Math.max(Math.round(Number(e.currentTarget.value)), 0));
							e.currentTarget.value = String(validatedValue);
							updateCard({ columnId, cardId, cardUpdate: { type: 'frame-card', opacity: validatedValue } });
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
				<Inline alignBlock="baseline" xcss={xcss({ fontSize: 'small' })}>
					<span>SFX:</span>
					<Textfield
						appearance="subtle"
						placeholder="Randomly played SFX list (comma-separated)"
						defaultValue={sfx.join(', ')}
						onBlur={e => {
							const validatedValue = e.currentTarget.value.split(',').map(s => s.trim());
							e.currentTarget.value = validatedValue.join(', ');
							updateCard({ columnId, cardId, cardUpdate: { type: 'frame-card', sfx: validatedValue } });
							e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
						}}
						style={{ paddingBlock: '1px', fontSize: 'small', pointerEvents: 'none' }}
					/>
				</Inline>
			</Stack>
			{closestEdge && <DropIndicator edge={closestEdge} gap={token('space.100', '0')} />}
		</Grid>
	);
};

export const Card = ({ item, order }: { item: CardData, order: number }) => {
	const ref = useRef<HTMLDivElement | null>(null);
	const { cardId } = item;
	const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
	const [state, setState] = useState<State>(idleState);

	const { getColumns } = useBoardContext();
	const { columnId } = useColumnContext();
	const columns = getColumns();
	const currentColumn = columns.find(column => column.columnId === columnId);
	invariant(currentColumn);

	const actionMenuTriggerRef = useRef<HTMLButtonElement>(null);
	const { instanceId, registerCard } = useBoardContext();
	useEffect(() => {
		invariant(actionMenuTriggerRef.current);
		invariant(ref.current);
		return registerCard({
			cardId,
			entry: {
				element: ref.current,
				actionMenuTrigger: actionMenuTriggerRef.current,
			},
		});
	}, [registerCard, cardId]);

	useEffect(() => {
		const element = ref.current;
		invariant(element);
		return combine(
			draggable({
				element: element,
				getInitialData: () => ({ type: 'card', subtype: item.type, cardId, instanceId }),
				onGenerateDragPreview: ({ location, source, nativeSetDragImage }) => {
					const rect = source.element.getBoundingClientRect();

					setCustomNativeDragPreview({
						nativeSetDragImage,
						getOffset: preserveOffsetOnSource({
							element,
							input: location.current.input,
						}),
						render({ container }) {
							setState({ type: 'preview', container, rect });
							return () => setState(draggingState);
						},
					});
				},
				onDragStart: () => setState(draggingState),
				onDrop: () => setState(idleState),
			}),
			dropTargetForExternal({
				element: element,
				canDrop: ({ source }) => currentColumn.type === 'image-column' && containsFiles({ source }),
				getIsSticky: () => true,
				getData: ({ input, element }) => {
					const data = { type: 'card', cardId };

					return attachClosestEdge(data, {
						input,
						element,
						allowedEdges: ['top', 'bottom'],
					});
				},
				onDragEnter: (args) => setClosestEdge(extractClosestEdge(args.self.data)),
				onDrag: (args) => setClosestEdge(extractClosestEdge(args.self.data)),
				onDragLeave: () => setClosestEdge(null),
				onDrop: () => setClosestEdge(null),
			}),
			dropTargetForElements({
				element: element,
				canDrop: ({ source }) => {
					return source.data.instanceId === instanceId && source.data.type === 'card' && (source.data.subtype === 'image-card' || currentColumn.type === 'event-column');
				},
				getIsSticky: () => true,
				getData: ({ input, element }) => {
					const data = { type: 'card', cardId };

					return attachClosestEdge(data, {
						input,
						element,
						allowedEdges: ['top', 'bottom'],
					});
				},
				onDragEnter: (args) => {
					if (args.source.data.cardId !== cardId) {
						setClosestEdge(extractClosestEdge(args.self.data));
					}
				},
				onDrag: (args) => {
					if (args.source.data.cardId !== cardId) {
						setClosestEdge(extractClosestEdge(args.self.data));
					}
				},
				onDragLeave: () => setClosestEdge(null),
				onDrop: () => setClosestEdge(null),
			}),
		);
	}, [instanceId, item, cardId]);

	return (
		<Fragment>
			<CardPrimitive
				ref={ref}
				item={item}
				order={order}
				state={state}
				closestEdge={closestEdge}
				actionMenuTriggerRef={actionMenuTriggerRef}
			/>
			{state.type === 'preview' &&
				ReactDOM.createPortal(
					<Box
						style={{
							/**
							 * Ensuring the preview has the same dimensions as the original.
							 *
							 * Using `border-box` sizing here is not necessary in this
							 * specific example, but it is safer to include generally.
							 */
							// eslint-disable-next-line @atlaskit/ui-styling-standard/enforce-style-prop -- Ignored via go/DSP-18766
							boxSizing: 'border-box',
							width: state.rect.width,
							height: state.rect.height,
						}}
					>
						<CardPrimitive item={item} order={order} state={state} closestEdge={null} />
					</Box>,
					state.container,
				)}
		</Fragment>
	);
};

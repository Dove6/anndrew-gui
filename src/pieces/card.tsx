import {
	type ForwardedRef,
	forwardRef,
	Fragment,
	memo,
	type Ref,
	type RefAttributes,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';

import ReactDOM from 'react-dom';
import invariant from 'tiny-invariant';

import Avatar from '@atlaskit/avatar';
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
import { Box, Grid, Stack, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';

import { type ColumnData, type CardData, type ImageCard, type FrameCard, type EventColumn } from '../models';

import { useBoardContext } from './board-context';
import { useColumnContext } from './column-context';

type State =
	| { type: 'idle' }
	| { type: 'preview'; container: HTMLElement; rect: DOMRect }
	| { type: 'dragging' };

const idleState: State = { type: 'idle' };
const draggingState: State = { type: 'dragging' };

const noMarginStyles = xcss({ margin: 'space.0' });
const noPointerEventsStyles = xcss({ pointerEvents: 'none' });
const baseStyles = xcss({
	width: '100%',
	padding: 'space.100',
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

const buttonColumnStyles = xcss({
	alignSelf: 'start',
});

type CardPrimitiveProps = {
	closestEdge: Edge | null;
	item: CardData;
	state: State;
	actionMenuTriggerRef?: Ref<HTMLButtonElement>;
};

type ImageCardPrimitiveProps = {
	closestEdge: Edge | null;
	item: ImageCard;
	state: State;
	cardDivRef: Ref<HTMLDivElement>;
	actionMenuTriggerRef?: Ref<HTMLButtonElement>;
};

type FrameCardPrimitiveProps = {
	closestEdge: Edge | null;
	item: FrameCard;
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
	const { moveCard } = useBoardContext();
	const { columnId } = useColumnContext();

	const onClick = useCallback(() => {
		moveCard({
			startColumnId: columnId,
			finishColumnId: targetColumn.columnId,
			itemIndexInStartColumn: startIndex,
		});
	}, [columnId, moveCard, startIndex, targetColumn.columnId]);

	return <DropdownItem onClick={onClick}>{`Event ${targetColumn.name}`}</DropdownItem>;
}

function LazyDropdownItems({ cardId }: { cardId: string }) {
	const { getColumns, reorderCard } = useBoardContext();
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

const CardPrimitive = forwardRef<HTMLDivElement, CardPrimitiveProps>(function CardPrimitive({ closestEdge, item, state, actionMenuTriggerRef }, ref) {
	switch (item.type) {
		case 'image-card':
			return <ImageCardPrimitive closestEdge={closestEdge} item={item} state={state} actionMenuTriggerRef={actionMenuTriggerRef} cardDivRef={ref} />;
		default:
			return <FrameCardPrimitive closestEdge={closestEdge} item={item} state={state} actionMenuTriggerRef={actionMenuTriggerRef} cardDivRef={ref} />;
	}
});

const ImageCardPrimitive = (
	{ closestEdge, item, state, actionMenuTriggerRef, cardDivRef }: ImageCardPrimitiveProps,
) => {
	const { cardId: cardId, name, contentUrl, offset } = item;

	return (
		<Grid
			ref={cardDivRef}
			testId={`item-${cardId}`}
			templateColumns="auto 1fr auto"
			columnGap="space.100"
			alignItems="center"
			xcss={[imageBaseStyles, stateStyles[state.type]]}
		>
			<Box as="span" xcss={noPointerEventsStyles}>
				<Avatar size="xlarge" appearance="square" src={contentUrl} />
			</Box>

			<Stack space="space.050" grow="fill">
				<Heading size="xsmall" as="span">
					{name}
				</Heading>
				<Box as="small" xcss={noMarginStyles}>
					{`Offset: ${offset.x} x ${offset.y} px`}
				</Box>
			</Stack>
			<Box xcss={buttonColumnStyles}>
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
			</Box>
			{closestEdge && <DropIndicator edge={closestEdge} gap={token('space.100', '0')} />}
		</Grid>
	);
};

const FrameCardPrimitive = (
	{ closestEdge, item, state, actionMenuTriggerRef, cardDivRef }: FrameCardPrimitiveProps,
) => {
	const { cardId, name, imageRef, offset, sfx, opacity } = item;

	return (
		<Grid
			ref={cardDivRef}
			testId={`item-${cardId}`}
			templateColumns="auto 1fr auto"
			columnGap="space.100"
			alignItems="center"
			xcss={[baseStyles, stateStyles[state.type]]}
		>
			<Box as="span" xcss={noPointerEventsStyles}>
				<Avatar size="large" appearance="square" src={imageRef.contentUrl} />
			</Box>

			<Stack space="space.050" grow="fill">
				<Heading size="xsmall" as="span">
					{name}
				</Heading>
				<Box as="small" xcss={noMarginStyles}>
					{`Offset: ${offset.x} x ${offset.y} px`}
				</Box>
				<Box as="small" xcss={noMarginStyles}>
					{`Opacity: ${Math.round(opacity / 255 * 1000) / 10}%`}
				</Box>
				{sfx?.length
					? <Box as="small" xcss={noMarginStyles}>
						{`SFX: ${sfx.join(', ')}`}
					</Box>
					: <></>}
			</Stack>
			<Box xcss={buttonColumnStyles}>
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
			</Box>
			{closestEdge && <DropIndicator edge={closestEdge} gap={token('space.100', '0')} />}
		</Grid>
	);
};

export const Card = memo(function Card({ item }: { item: CardData }) {
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
						<CardPrimitive item={item} state={state} closestEdge={null} />
					</Box>,
					state.container,
				)}
		</Fragment>
	);
});

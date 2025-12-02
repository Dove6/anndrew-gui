import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import UploadIcon from '@atlaskit/icon/core/upload';
import Button, { IconButton } from '@atlaskit/button/new';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { containsFiles, getFiles } from '@atlaskit/pragmatic-drag-and-drop/external/file';
import { dropTargetForExternal, monitorForExternal } from '@atlaskit/pragmatic-drag-and-drop/external/adapter';
import BoardExample from './example';
import { Box, xcss } from '@atlaskit/primitives';
import { loadAnn } from './fileFormats/ann';
import { getNextCardId, getNextColumnId, type BoardState, type ColumnData, type FrameCard, type ImageCard, type ImageColumn } from './models';
import { token } from '@atlaskit/tokens';
import PremiumIcon from '@atlaskit/icon/core/premium';
import { Jimp, type JimpInstance } from "jimp";

const boardStyles = xcss({
    paddingBlockStart: 'space.250',
    paddingInlineStart: 'space.200',
    paddingInlineEnd: 'space.200',
    display: 'flex',
    alignItems: 'center',
    gap: 'space.200',
    flexDirection: 'column',
    userSelect: 'none',
});

type State =
    | { type: 'idle' }
    | { type: 'is-over' };

const idleState: State = { type: 'idle' };
const isOverState: State = { type: 'is-over' };

export const App = () => {
    const [instanceId] = useState(() => Symbol('instance-id'));

    const [state, setState] = useState<State>(idleState);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const uploaderRef = useRef<HTMLInputElement | null>(null);

    const [initialBoardState, setInitialBoardState] = useState<BoardState>();

    const setSourceAnn = useCallback(async (buffer: ArrayBuffer, filename: string) => {
        const ann = loadAnn(buffer);

        const loadedGraphics: JimpInstance[] = await Promise.all(ann.images.map((imageBytes, imageIndex) => Jimp.fromBitmap({
            width: ann.annImages[imageIndex].width,
            height: ann.annImages[imageIndex].height,
            data: imageBytes,
        })));
        const contentUrls = await Promise.all(loadedGraphics.map(loaded => loaded.getBase64('image/png')));

        const images = ann.annImages.map((image, imageIndex) => ({
            type: 'image-card',
            cardId: `card:${getNextCardId()}`,
            name: image.name ?? '',
            offset: {
                x: image.positionX,
                y: image.positionY,
            },
            contentUrl: contentUrls[imageIndex],
        } as ImageCard));

        const imageColumn: ImageColumn = {
            type: 'image-column',
            columnId: `column:${getNextColumnId()}`,
            items: images,
        };

        const events = ann.events.map(event => ({
            type: 'event-column',
            columnId: `column:${getNextColumnId()}`,
            name: event.name ?? '',
            opacity: event.transparency,
            loopLength: event.loopAfterFrame,
            items: event.frames.map((frame, frameIndex) => ({
                type: 'frame-card',
                cardId: `card:${getNextCardId()}`,
                name: frame.name ?? '',
                offset: {
                    x: frame.positionX,
                    y: frame.positionY,
                },
                opacity: frame.transparency,
                sfx: frame.sounds ?? [],
                imageRef: images[event.framesImageMapping[frameIndex]],
            } as FrameCard)),
        } as ColumnData));

        const columns = [imageColumn, ...events];

        setInitialBoardState({
            columnMap: Object.fromEntries(columns.map(column => [column.columnId, column])),
            orderedColumnIds: columns.map(column => column.columnId),

            filename: filename.toLowerCase().endsWith('.ann') ? filename.slice(0, filename.length - 4) : filename,
            author: ann.header.author,
            description: ann.header.description,
            fps: ann.header.fps,
            opacity: ann.header.transparency,

            lastOperation: null,
        });
    }, [instanceId, setInitialBoardState]);

    const createEmpty = useCallback(() => {
        const imagesColumn: ColumnData = {
            type: 'image-column',
            columnId: 'images',
            items: [],
        };

        setInitialBoardState({
            columnMap: {
                [imagesColumn.columnId]: imagesColumn,
            },
            orderedColumnIds: [imagesColumn.columnId],

            filename: 'animation',
            author: 'You',
            description: '',
            fps: 16,
            opacity: 255,

            lastOperation: null,
        });
    }, [instanceId, setInitialBoardState]);

    useEffect(() => {
        const element = buttonRef.current;
        return element ? combine(
            dropTargetForExternal({
                element: element,
                canDrop: containsFiles,
                getIsSticky: () => true,
                onDragEnter: () => setState(isOverState),
                onDragLeave: () => setState(idleState),
                onDrop: () => setState(idleState),
            }),
            monitorForExternal({
                onDragStart: () => {
                    preventUnhandled.start();
                },
                onDrop: (args) => {
                    const { location, source } = args;
                    // didn't drop on anything
                    if (!location.current.dropTargets.length) {
                        console.log('didnt drop on anything');
                        return;
                    }

                    preventUnhandled.stop();

                    const files = getFiles({ source });
                    files.forEach(async (file) => {
                        if (file == null) {
                            return;
                        }
                        const buffer = await file.arrayBuffer();
                        setSourceAnn(buffer, file.name);
                    });
                },
            }),
        ) : () => { };
    }, [instanceId, buttonRef.current]);

    useEffect(() => {
        const element = buttonRef.current;
        if (!element) {
            return;
        }
        element.style.width = '90%';
        element.style.height = '50vh';
        element.style.backgroundColor = state === isOverState
            ? token('color.background.selected.hovered')
            : token('elevation.surface.sunken');
    }, [buttonRef.current, state]);

    const onClear = useCallback(() => setInitialBoardState(undefined), [setInitialBoardState]);

    const appInsides = (typeof (initialBoardState) !== 'undefined'
        ? <BoardExample instanceId={instanceId} initialData={initialBoardState} onClear={onClear}></BoardExample>
        : <Box xcss={boardStyles}>
            <span>Upload an ANN file below</span>
            <IconButton
                icon={UploadIcon}
                label={<span style={{ userSelect: 'none' }}>Upload ANN file</span>}
                isTooltipDisabled={false}
                appearance="default"
                ref={buttonRef}
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
                        const buffer = await file.arrayBuffer();
                        setSourceAnn(buffer, file.name);
                    };
                    input.click();
                }}
            />
            <input type="file" ref={uploaderRef} style={{ display: 'none' }} />
            <div style={{ marginBlock: '0.5em' }}></div>
            <Button
                iconBefore={PremiumIcon}
                appearance="discovery"
                onClick={createEmpty}
            >
                Or create a new file
            </Button>
        </Box>
    );

    return <Box xcss={xcss({ width: '100%', height: '100vh' })}>{appInsides}</Box>;
};

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import UploadIcon from '@atlaskit/icon/core/upload';
import { IconButton } from '@atlaskit/button/new';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { containsFiles, getFiles } from '@atlaskit/pragmatic-drag-and-drop/external/file';
import { dropTargetForExternal, monitorForExternal } from '@atlaskit/pragmatic-drag-and-drop/external/adapter';
import { bind, type UnbindFn } from 'bind-event-listener';
import BoardExample from './example';
import { Box, xcss } from '@atlaskit/primitives';
import { loadAnn } from './fileFormats/ann';
import type { BoardState, ColumnData, FrameCard, ImageCard, ImageColumn } from './models';
import { encode as encodePng } from 'fast-png';
import { token } from '@atlaskit/tokens';

const boardStyles = xcss({
    paddingBlockStart: 'space.250',
    paddingInlineStart: 'space.200',
    paddingInlineEnd: 'space.200',
    display: 'flex',
    alignItems: 'center',
    gap: 'space.200',
    flexDirection: 'column',
    height: '50vh',
});

type State =
    | { type: 'idle' }
    | { type: 'is-over' };

const idleState: State = { type: 'idle' };
const isOverState: State = { type: 'is-over' };

async function bytesToBase64DataUrl(bytes: BlobPart, type = 'application/octet-stream') {
    return await new Promise((resolve, reject) => {
        const reader = Object.assign(new FileReader(), {
            onload: () => resolve(reader.result),
            onerror: () => reject(reader.error),
        });
        reader.readAsDataURL(new File([bytes], '', { type }));
    });
}

export const App = () => {
    const [instanceId] = useState(() => Symbol('instance-id'));

    const [state, setState] = useState<State>(idleState);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const uploaderRef = useRef<HTMLInputElement | null>(null);

    const [initialBoardState, setInitialBoardState] = useState<BoardState>();

    const setSourceAnn = useCallback(async (buffer: ArrayBuffer, filename: string) => {
        const ann = loadAnn(buffer);

        const contentUrls = await Promise.all(ann.images.map((imageBytes, imageIndex) => bytesToBase64DataUrl(encodePng({
            width: ann.annImages[imageIndex].width,
            height: ann.annImages[imageIndex].height,
            data: imageBytes,
        }) as BlobPart)));

        const images = ann.annImages.map((image, imageIndex) => ({
            type: 'image-card',
            cardId: `card:${crypto.randomUUID()}`,
            name: image.name ?? '',
            offset: {
                x: image.positionX,
                y: image.positionY,
            },
            contentUrl: contentUrls[imageIndex],
        } as ImageCard));

        const imageColumn: ImageColumn = {
            type: 'image-column',
            columnId: `column:${crypto.randomUUID()}`,
            items: images,
        };

        const events = ann.events.map(event => ({
            type: 'event-column',
            columnId: `column:${crypto.randomUUID()}`,
            name: event.name ?? '',
            opacity: event.transparency,
            loopLength: event.loopAfterFrame,
            items: event.frames.map((frame, frameIndex) => ({
                type: 'frame-card',
                cardId: `card:${crypto.randomUUID()}`,
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
                    files.forEach((file) => {
                        if (file == null) {
                            return;
                        }

                        const reader = new FileReader();
                        reader.readAsArrayBuffer(file);
                        const unbind: UnbindFn = bind(reader, {
                            type: 'load',
                            listener: (_) => {
                                const result = reader.result;
                                if (typeof result !== 'string' && result !== null) {
                                    setSourceAnn(result, file.name);
                                } else {
                                    console.error('Invalid type of FileReader result');
                                }
                                unbind();
                            },
                        });
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
        element.style.height = '100%';
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
                label="Upload ANN file"
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
                    input.onchange = () => {
                        input.oncancel = null;
                        input.onchange = null;
                        if (input.files?.length !== 1) {
                            return;
                        }
                        const file = input.files[0];
                        const reader = new FileReader();
                        reader.readAsArrayBuffer(file);
                        const unbind: UnbindFn = bind(reader, {
                            type: 'load',
                            listener: (_) => {
                                const result = reader.result;
                                if (typeof result !== 'string' && result !== null) {
                                    setSourceAnn(result, file.name);
                                } else {
                                    console.error('Invalid type of FileReader result');
                                }
                                unbind();
                            },
                        });
                    };
                    input.click();
                }}
            />
            <input type="file" ref={uploaderRef} style={{ display: 'none' }} />
        </Box>
    );

    return <Box xcss={xcss({ width: '100vw', height: '100vh' })}>{appInsides}</Box>;
};

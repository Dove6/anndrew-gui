import {
    Fragment,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import invariant from 'tiny-invariant';
import UploadIcon from '@atlaskit/icon/core/upload';
import { IconButton } from '@atlaskit/button/new';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { containsFiles, getFiles } from '@atlaskit/pragmatic-drag-and-drop/external/file';
import { dropTargetForExternal, monitorForExternal } from '@atlaskit/pragmatic-drag-and-drop/external/adapter';
import { bind, type UnbindFn } from 'bind-event-listener';
import BoardExample from './example';
import { Box, xcss } from '@atlaskit/primitives';
import { loadAnn, type ANN } from './fileFormats/ann';

const boardStyles = xcss({
    paddingBlockStart: 'space.250',
    paddingInlineStart: 'space.200',
    paddingInlineEnd: 'space.200',
    display: 'flex',
    justifyContent: 'center',
    gap: 'space.200',
    flexDirection: 'row',
    height: '720px',
});

// type State =
//     | { type: 'idle' }
//     | { type: 'is-over' };

// const idle: State = { type: 'idle' };
// const isOver: State = { type: 'is-over' };

// const stateStyles: {
//     [key in State['type']]: ReturnType<typeof xcss> | undefined;
// } = {
//     idle: undefined,
//     'is-over': xcss({
//         backgroundColor: 'color.background.selected.hovered',
//     }),
// };

export const App = () => {
    const [instanceId] = useState(() => Symbol('instance-id'));

    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const uploaderRef = useRef<HTMLInputElement | null>(null);

    const [sourceAnnData, setSourceAnnData] = useState<ANN>();

    const setSourceAnn = useCallback((buffer: ArrayBuffer) => {
        const ann = loadAnn(buffer);
        setSourceAnnData(ann);
        console.log(ann);
    }, [instanceId, setSourceAnnData]);

    useEffect(() => {
        const element = buttonRef.current;
        invariant(element);
        return combine(
            dropTargetForExternal({
                element: element,
                canDrop: containsFiles,
                getIsSticky: () => true,
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
                        console.log('handling file', file);
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
                                    setSourceAnn(result);
                                } else {
                                    console.error('Invalid type of FileReader result');
                                }
                                unbind();
                            },
                        });
                    });
                },
            }),
        );
    }, [instanceId, buttonRef.current]);

    useEffect(() => {
        const element = buttonRef.current;
        if (!element) {
            return;
        }
        element.style.height = '720px';
        element.style.width = '90%';
    }, [buttonRef.current]);

    return (typeof (sourceAnnData) !== 'undefined'
        ? <BoardExample instanceId={instanceId}></BoardExample>
        : <Box xcss={boardStyles}>
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
                                    setSourceAnn(result);
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
};

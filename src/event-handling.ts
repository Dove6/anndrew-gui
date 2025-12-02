import { Jimp } from 'jimp';
import React from 'react';


export const blurOnEnterDown: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (e.key === 'Enter') {
        e.currentTarget.blur();
    }
};

export const allowTextSelection = (ref: React.MutableRefObject<HTMLElement | null>) => ((_: React.MouseEvent) => {
    if (!ref.current) {
        return;
    }
    let element: HTMLElement | null = ref.current;
    while (element !== null) {
        if (element.hasAttribute('draggable')) {
            element.draggable = false;
        }
        element = element.parentElement;
    }
});

export const disallowTextSelection = (ref: React.MutableRefObject<HTMLElement | null>) => ((_: React.MouseEvent) => {
    if (!ref.current) {
        return;
    }
    let element: HTMLElement | null = ref.current;
    while (element !== null) {
        if (element.hasAttribute('draggable')) {
            element.draggable = true;
        }
        element = element.parentElement;
    }
});

export const readImageFile = async (file?: File) => {
    if (!file) {
        throw new Error('Dropped no file');
    }
    if (!file.type.startsWith('image/')) {
        throw new Error('Dropped file is not an image');
    }

    const buffer = await file.arrayBuffer();
    const image = await Jimp.read(buffer);
    return await image.getBase64('image/png');
}

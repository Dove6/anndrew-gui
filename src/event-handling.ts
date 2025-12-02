import { Jimp } from 'jimp';
import React from 'react';
import { loadImage as loadImg } from './fileFormats/img';


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
    if (!(file.type.startsWith('image/') || await file.slice(0, 4).text() === 'PIK\0')) {
        throw new Error('Dropped file is not an image, ' + ((file.type ?? '').trim().length > 0 ? `detected MIME type: ${file.type}` : 'no detected MIME type'));
    }

    const name = file.name.replace(/\.[a-z0-9]+$/i, '');

    const buffer = await file.arrayBuffer();
    if (file.type.startsWith('image/')) {
        const image = await Jimp.read(buffer);
        return {
            name,
            contentUrl: await image.getBase64('image/png'),
            offset: {
                x: 0,
                y: 0,
            },
        };
    }

    const loadedImg = loadImg(buffer);
    const image = await Jimp.fromBitmap({
        width: loadedImg.header.width,
        height: loadedImg.header.height,
        data: new Uint8Array(loadedImg.bytes),
    });
    return {
        name,
        contentUrl: await image.getBase64('image/png'),
        offset: {
            x: loadedImg.header.positionX,
            y: loadedImg.header.positionY,
        },
    };
}

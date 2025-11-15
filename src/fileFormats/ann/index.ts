import { BinaryBuffer, createGrowableDataView, stringUntilNull } from '../utils'
import { type CompressedImageHeader, createDescriptors, loadImageWithoutHeader, storeImageWithoutHeader } from '../img'
import type { CompressionType } from '../compression';

const decoder = new TextDecoder('windows-1250')

const encoder: TextEncoder = (() => {
    const WINDOWS_1250_DECODE_LUT = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
        32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46,
        47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61,
        62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,
        77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91,
        92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105,
        106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118,
        119, 120, 121, 122, 123, 124, 125, 126, 127, 160, 164, 166, 167,
        168, 169, 171, 172, 173, 174, 176, 177, 180, 181, 182, 183, 184,
        187, 193, 194, 196, 199, 201, 203, 205, 206, 211, 212, 214, 215,
        218, 220, 221, 223, 225, 226, 228, 231, 233, 235, 237, 238, 243,
        244, 246, 247, 250, 252, 253, 258, 259, 260, 261, 262, 263, 268,
        269, 270, 271, 272, 273, 280, 281, 282, 283, 313, 314, 317, 318,
        321, 322, 323, 324, 327, 328, 336, 337, 340, 341, 344, 345, 346,
        347, 350, 351, 352, 353, 354, 355, 356, 357, 366, 367, 368, 369,
        377, 378, 379, 380, 381, 382, 711, 728, 729, 731, 733, 8211, 8212,
        8216, 8217, 8218, 8220, 8221, 8222, 8224, 8225, 8226, 8230, 8240, 8249, 8250, 8364, 8482
    ];

    const WINDOWS_1250_ENCODE_LUT: number[] = [];
    WINDOWS_1250_DECODE_LUT.forEach((c, i) => WINDOWS_1250_ENCODE_LUT[c] = i);

    return {
        encoding: 'windows-1250',
        encode: (input: string) => new Uint8Array(input.split('').map(c => WINDOWS_1250_ENCODE_LUT[c.codePointAt(0)!] ?? '?'.charCodeAt(0))),
        encodeInto: (source: string, destination: Uint8Array) => {
            const read = Math.min(source.length, destination.length);
            for (let i = 0; i < read; i++) {
                destination[i] = WINDOWS_1250_ENCODE_LUT[source[i].codePointAt(0)!] ?? '?'.charCodeAt(0);
            }
            return {
                read,
                written: read,
            };
        },
    };
})();

export const annCompressionTypeMapping: { [compressionType: number]: [CompressionType, CompressionType] } = {
    0: ['NONE', 'NONE'],
    2: ['CLZW', 'CLZW'],
    3: ['CLZW_IN_CRLE', 'CLZW_IN_CRLE'],
    4: ['CRLE', 'CRLE'],
};

interface AnnHeader {
    framesCount: number
    bpp: number
    eventsCount: number
    fps: number
    flags: number
    transparency: number
    randomFramesNumber: number
    author: string
    description: string
}

export interface Event {
    name: string
    framesCount: number
    loopAfterFrame: number
    transparency: number

    framesImageMapping: Array<number>
    frames: Array<Frame>
}

export interface Frame {
    positionX: number
    positionY: number
    hasSounds: number
    transparency: number
    name: string
    sounds: string[]
}

export interface AnnImage extends CompressedImageHeader {
    positionX: number
    positionY: number
    name: string
}

export interface ANN {
    header: AnnHeader
    events: Event[]
    images: Uint8Array<ArrayBuffer>[]
    annImages: AnnImage[]
}

const parseHeader = (view: BinaryBuffer) => {
    const magic = view.getUint32()
    if (magic != 0x50564e) {
        throw new Error('Not an image')
    }

    const ann = {} as AnnHeader
    ann.framesCount = view.getUint16()
    ann.bpp = view.getUint16()
    ann.eventsCount = view.getUint16()
    view.skip(0xd)
    ann.fps = view.getUint32()
    ann.flags = view.getUint32()
    ann.transparency = view.getUint8()
    ann.randomFramesNumber = view.getUint16()
    view.skip(0xa)

    const authorLen = view.getUint32()
    ann.author = decoder.decode(view.read(authorLen))

    const descriptionLen = view.getUint32()
    ann.description = decoder.decode(view.read(descriptionLen))

    return ann
}

const storeHeader = (header: AnnHeader, buffer: BinaryBuffer) => {
    buffer.setUint32(0x50564e)  // NVP\0

    buffer.setUint16(header.framesCount)
    buffer.setUint16(header.bpp)
    buffer.setUint16(header.eventsCount)
    buffer.skip(0xd)

    buffer.setUint32(header.fps)
    buffer.setUint32(header.flags)
    buffer.setUint8(header.transparency)
    buffer.setUint16(header.randomFramesNumber)
    buffer.skip(0xa)

    const encodedAuthor = encoder.encode(header.author);
    buffer.setUint32(encodedAuthor.length);
    buffer.write(encodedAuthor);

    const encodedDescription = encoder.encode(header.description);
    buffer.setUint32(encodedDescription.length);
    buffer.write(encodedDescription);
}

const parseFrame = (view: BinaryBuffer) => {
    const frame = {} as Frame
    view.skip(4)
    view.skip(4)
    frame.positionX = view.getInt16()
    frame.positionY = view.getInt16()
    view.skip(4)
    frame.hasSounds = view.getUint32()
    view.skip(4)
    frame.transparency = view.getUint8()
    view.skip(5)

    const nameSize = view.getUint32()
    frame.name = stringUntilNull(decoder.decode(view.read(nameSize)))

    if (frame.hasSounds != 0) {
        const soundsLen = view.getUint32()
        frame.sounds = stringUntilNull(decoder.decode(view.read(soundsLen)))
            .split(';')
            .filter((x) => x.trim() !== '')
    }

    return frame
}

const storeFrame = (frame: Frame, buffer: BinaryBuffer) => {
    buffer.setUint8(0x00);
    buffer.setUint8(0xa4);
    buffer.setUint8(0xce);
    buffer.setUint8(0x57);
    buffer.skip(0x4);
    buffer.setUint16(frame.positionX);
    buffer.setUint16(frame.positionY);
    buffer.setUint32(0xffffffff);
    buffer.setUint32(frame.hasSounds);
    buffer.skip(4);
    buffer.setUint8(frame.transparency);
    buffer.skip(5);

    const encodedName = encoder.encode(frame.name + '\0');
    buffer.setUint32(encodedName.length);
    buffer.write(encodedName);

    if (frame.hasSounds !== 0) {
        const encodedSfx = encoder.encode(frame.sounds.map(s => s.trim()).join(';') + '\0');
        buffer.setUint32(encodedSfx.length);
        buffer.write(encodedSfx);
    }
}

const parseEvent = (view: BinaryBuffer) => {
    const event = {} as Event
    event.name = stringUntilNull(decoder.decode(view.read(0x20)))
    event.framesCount = view.getUint16()
    view.skip(0x6)
    event.loopAfterFrame = view.getUint32()
    view.skip(0x4 + 0x6)
    event.transparency = view.getUint8()
    view.skip(0xc)

    event.framesImageMapping = []
    for (let i = 0; i < event.framesCount; i++) {
        event.framesImageMapping.push(view.getUint16())
    }

    event.frames = []
    for (let i = 0; i < event.framesCount; i++) {
        event.frames.push(parseFrame(view))
    }

    return event
}

const storeEvent = (event: Event, buffer: BinaryBuffer) => {
    const encodedName = new Uint8Array(32);
    encoder.encodeInto(event.name + '\0', encodedName);
    buffer.write(encodedName);

    buffer.setUint16(event.framesCount)
    buffer.skip(0x6)
    buffer.setUint32(event.loopAfterFrame % event.framesCount)
    buffer.skip(0xa)
    buffer.setUint8(event.transparency)
    buffer.skip(0xc)

    for (let i = 0; i < event.framesCount; i++) {
        buffer.setUint16(event.framesImageMapping[i]);
    }

    for (let i = 0; i < event.framesCount; i++) {
        storeFrame(event.frames[i], buffer);
    }
}

const parseAnnImage = (view: BinaryBuffer) => {
    const img = {} as AnnImage
    img.width = view.getUint16()
    img.height = view.getUint16()
    img.positionX = view.getInt16()
    img.positionY = view.getInt16()
    img.compressionType = view.getUint16()
    img.imageLen = view.getUint32()

    const someDataLen = view.getUint16() // some size, happens to be 4
    view.read(someDataLen) // some data, the size is for data here
    view.skip(12 - someDataLen)

    img.alphaLen = view.getUint32()
    img.name = stringUntilNull(decoder.decode(view.read(0x14)))

    return img
}

const storeAnnImage = (img: AnnImage, buffer: BinaryBuffer) => {
    buffer.setUint16(img.width);
    buffer.setUint16(img.height);
    buffer.setInt16(img.positionX);
    buffer.setInt16(img.positionY);
    buffer.setUint16(img.compressionType);
    buffer.setUint32(img.imageLen);
    const misteriousValue = 4;
    buffer.setUint16(misteriousValue);
    buffer.skip(misteriousValue);
    buffer.skip(12 - misteriousValue);
    buffer.setUint32(img.alphaLen);

    const encodedName = new Uint8Array(20);
    encoder.encodeInto(img.name, encodedName);
    buffer.write(encodedName);
}

export const loadAnn = (data: ArrayBuffer) => {
    const buffer = new BinaryBuffer(new DataView(data))
    const header = parseHeader(buffer)

    const events: Event[] = []
    for (let i = 0; i < header.eventsCount; i++) {
        events.push(parseEvent(buffer))
    }

    const annImages = []
    for (let i = 0; i < header.framesCount; i++) {
        annImages.push(parseAnnImage(buffer))
    }

    const images = []
    for (let i = 0; i < header.framesCount; i++) {
        const img = annImages[i]
        const { colorDescriptor, alphaDescriptor } = createDescriptors(img, annCompressionTypeMapping)
        images.push(loadImageWithoutHeader(buffer, colorDescriptor, alphaDescriptor))
    }

    return {
        header,
        events,
        images,
        annImages,
    } as ANN
}

export const dumpAnn = (ann: ANN) => {
    const view = createGrowableDataView();
    const viewBuffer = view.internalBuffer;
    const buffer = new BinaryBuffer(view);
    const storedParts: BlobPart[] = [];

    storeHeader(ann.header, buffer);
    for (let i = 0; i < ann.header.eventsCount; i++) {
        storeEvent(ann.events[i], buffer);
    }

    const annImages = new Array(ann.annImages.length);
    for (let i = 0; i < ann.header.framesCount; i++) {
        const { header, compressedColor, compressedAlpha } = storeImageWithoutHeader({ ...ann.annImages[i], compressionType: 0 }, ann.images[i]);
        annImages[i] = header;
        storedParts.push(compressedColor);
        if (header.alphaLen !== 0) {
            storedParts.push(compressedAlpha);
        }
    }

    for (let i = 0; i < ann.header.framesCount; i++) {
        storeAnnImage(annImages[i], buffer);
    }

    storedParts.splice(0, 0, new Uint8Array(viewBuffer));

    return new Blob(storedParts, { type: 'application/octet-stream' });
}

import { encode } from 'iconv-lite'
import { BinaryBuffer, createGrowableDataView, stringUntilNull } from '../utils'
import { type CompressedImageHeader, createDescriptors, loadImageWithoutHeader, storeImageWithoutHeader } from '../img'
import type { CompressionType } from '../compression'

const encoder = {
    encode: (input: string) => encode(input, 'windows-1250')
}
const decoder = new TextDecoder('windows-1250')

export const annCompressionTypeMapping: { [compressionType: number]: [CompressionType, CompressionType] } = {
    0: ['NONE', 'NONE'],
    2: ['CLZW', 'CLZW'],
    3: ['CLZW_IN_CRLE', 'CLZW_IN_CRLE'],
    4: ['CRLE', 'CRLE'],
}

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
    if (magic != 0x50564e && magic != 0x4d564e) {
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

    const encodedAuthor = encoder.encode(header.author)
    buffer.setUint32(encodedAuthor.length)
    buffer.write(encodedAuthor)

    const encodedDescription = encoder.encode(header.description)
    buffer.setUint32(encodedDescription.length)
    buffer.write(encodedDescription)
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
    buffer.setUint8(0x00)
    buffer.setUint8(0xa4)
    buffer.setUint8(0xce)
    buffer.setUint8(0x57)
    buffer.skip(0x4)
    buffer.setUint16(frame.positionX)
    buffer.setUint16(frame.positionY)
    buffer.setUint32(0xffffffff)
    buffer.setUint32(frame.hasSounds)
    buffer.skip(4)
    buffer.setUint8(frame.transparency)
    buffer.skip(5)

    const encodedName = encoder.encode(frame.name + '\0')
    buffer.setUint32(encodedName.length)
    buffer.write(encodedName)

    if (frame.hasSounds !== 0) {
        const encodedSfx = encoder.encode(frame.sounds.map(s => s.trim()).join(';') + '\0')
        buffer.setUint32(encodedSfx.length)
        buffer.write(encodedSfx)
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
    const encodedName = new Uint8Array(32)
    encodedName.set(encoder.encode(event.name + '\0').subarray(0, encodedName.length))
    buffer.write(encodedName)

    buffer.setUint16(event.framesCount)
    buffer.skip(0x6)
    buffer.setUint32(event.loopAfterFrame % event.framesCount)
    buffer.skip(0xa)
    buffer.setUint8(event.transparency)
    buffer.skip(0xc)

    for (let i = 0; i < event.framesCount; i++) {
        buffer.setUint16(event.framesImageMapping[i])
    }

    for (let i = 0; i < event.framesCount; i++) {
        storeFrame(event.frames[i], buffer)
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
    buffer.setUint16(img.width)
    buffer.setUint16(img.height)
    buffer.setInt16(img.positionX)
    buffer.setInt16(img.positionY)
    buffer.setUint16(img.compressionType)
    buffer.setUint32(img.imageLen)
    const misteriousValue = 4
    buffer.setUint16(misteriousValue)
    buffer.skip(misteriousValue)
    buffer.skip(12 - misteriousValue)
    buffer.setUint32(img.alphaLen)

    const encodedName = new Uint8Array(20)
    encodedName.set(encoder.encode(img.name).subarray(0, encodedName.length))
    buffer.write(encodedName)
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
    const view = createGrowableDataView()
    const viewBuffer = view.internalBuffer
    const buffer = new BinaryBuffer(view)
    const storedParts: BlobPart[] = []

    storeHeader(ann.header, buffer)
    for (let i = 0; i < ann.header.eventsCount; i++) {
        storeEvent(ann.events[i], buffer)
    }

    const annImages = new Array(ann.annImages.length)
    for (let i = 0; i < ann.header.framesCount; i++) {
        const { header, compressedColor, compressedAlpha } = storeImageWithoutHeader({ ...ann.annImages[i], compressionType: 0 }, ann.images[i])
        annImages[i] = header
        storedParts.push(compressedColor)
        if (header.alphaLen !== 0) {
            storedParts.push(compressedAlpha)
        }
    }

    for (let i = 0; i < ann.header.framesCount; i++) {
        storeAnnImage(annImages[i], buffer)
    }

    storedParts.splice(0, 0, new Uint8Array(viewBuffer))

    return new Blob(storedParts, { type: 'application/octet-stream' })
}

import { BinaryBuffer, createGrowableDataView } from '../utils'
import { LZO } from 'lzo-ts'

export const decompressCLZW = (buffer: BinaryBuffer) => {
    const uncompressedSize = buffer.getUint32()
    const compressedSize = buffer.getUint32()

    const uncompressedBuffer = LZO.decompress(new Uint8Array(buffer.read(compressedSize)))
    if (uncompressedBuffer.byteLength !== uncompressedSize)
        throw new Error(`Invalid size of the uncompressed buffer: ${uncompressedBuffer.byteLength}, expected: ${uncompressedSize}`)
    return uncompressedBuffer
}

export const compressCLZW = (buffer: Uint8Array) => {
    const view = createGrowableDataView()
    const viewBuffer = view.internalBuffer
    const finalBuffer = new BinaryBuffer(view)

    const uncompressedSize = buffer.byteLength

    const compressedBuffer = LZO.compress(buffer)
    const compressedSize = compressedBuffer.byteLength
    console.log(`Uncompressed size: ${uncompressedSize}, compressed size: ${compressedSize}`)

    finalBuffer.setUint32(uncompressedSize)
    finalBuffer.setUint32(compressedSize)
    finalBuffer.write(compressedBuffer)

    return new Uint8Array(viewBuffer)
}

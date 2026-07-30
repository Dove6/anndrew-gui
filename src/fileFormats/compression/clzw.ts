import { BinaryBuffer } from '../utils'
import { LZO } from 'lzo-ts'

export const decompressCLZW = (buffer: BinaryBuffer) => {
    const uncompressedSize = buffer.getUint32()
    const compressedSize = buffer.getUint32()

    const uncompressedBuffer = LZO.decompress(new Uint8Array(buffer.read(compressedSize))).buffer
    if (uncompressedBuffer.byteLength !== uncompressedSize)
        throw new Error(`Invalid size of the uncompressed buffer: ${uncompressedBuffer.byteLength}, expected: ${uncompressedSize}`)
    return uncompressedBuffer
}

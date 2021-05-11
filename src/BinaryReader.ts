import * as bufferMethods from './buffer'
import { Reader } from './Reader'
import { fs } from './node'
import { EndianType } from './EndianType'
import { FileDescriptor } from './FileDescriptor'

const methods = bufferMethods.methods

const enum BinaryType {
  FILE,
  BUFFER
}

function readNumber<Reader extends BinaryReader> (reader: Reader, method: bufferMethods.MethodsReturnBigInt): bigint
function readNumber<Reader extends BinaryReader> (reader: Reader, method: Exclude<keyof typeof methods, bufferMethods.MethodsReturnBigInt>): number
function readNumber<Reader extends BinaryReader> (reader: Reader, method: keyof typeof methods): boolean | number | bigint {
  if (method === 'readBigInt64BE' || method === 'readBigInt64LE' || method === 'readBigUInt64BE' || method === 'readBigUInt64LE') {
    bufferMethods.validateBigInt()
  }
  const buf = new Uint8Array(methods[method])

  let readLength: number
  if (reader.type === BinaryType.FILE) {
    readLength = fs.readSync((reader as any)._file, buf, 0, methods[method], reader.pos)
  } else {
    readLength = bufferMethods.copy((reader as any)._buffer, buf, 0, reader.pos, reader.pos + methods[method])
  }
  reader.pos += readLength
  return bufferMethods[method](buf, 0)
}

/**
 * @public
 */
export class BinaryReader extends Reader {
  protected readonly _path: string
  private _file: number | null
  public readonly type!: 0 | 1
  private _buffer: Uint8Array | null
  private _opened: boolean

  public endian!: EndianType

  public constructor (buffer: string | Uint8Array | FileDescriptor, endian: EndianType = EndianType.BigEndian) {
    if (typeof buffer === 'string') {
      super(fs.statSync(buffer).size)
      Object.defineProperty(this, 'type', { configurable: true, enumerable: true, writable: false, value: BinaryType.FILE })
      this._file = fs.openSync(buffer, 'r')
      this._path = buffer
      this._buffer = null
    } else if (buffer instanceof Uint8Array) {
      super(buffer.length)
      Object.defineProperty(this, 'type', { configurable: true, enumerable: true, writable: false, value: BinaryType.BUFFER })
      this._file = null
      this._path = ''
      this._buffer = buffer
    } else if (buffer instanceof FileDescriptor) {
      super(buffer.size)
      Object.defineProperty(this, 'type', { configurable: true, enumerable: true, writable: false, value: BinaryType.FILE })
      this._file = buffer.fd
      this._path = buffer.path
      this._buffer = null
    } else {
      throw new TypeError('[BinaryReader] Contructor parameter type error')
    }
    Object.defineProperty(this, 'endian', {
      configurable: true,
      enumerable: true,
      get () { return endian },
      set (ed: EndianType) {
        if (ed !== EndianType.BigEndian && ed !== EndianType.LittleEndian) {
          throw new TypeError('endian type error')
        }
        endian = ed
      }
    })
    this._opened = true
  }

  public close (): void {
    if (this._opened) {
      if (this.type === BinaryType.FILE) {
        if (typeof this._file === 'number') {
          fs.closeSync(this._file)
        }
        this._file = null
      } else {
        this._buffer = null
      }
      this._opened = false
    }
  }

  public read (len: number = 1): Uint8Array {
    if (len === 0) {
      return new Uint8Array(0)
    }
    if (this.pos + len > this._size) {
      len = this._size - this.pos
    }
    const buf = new Uint8Array(len)
    let readLength: number
    if (this.type === BinaryType.FILE) {
      readLength = fs.readSync(this._file!, buf, 0, len, this.pos)
    } else {
      readLength = bufferMethods.copy(this._buffer!, buf, 0, this.pos, this.pos + len)
    }
    this.pos += readLength
    return buf
  }

  public readToBuffer (buf: Uint8Array, bufStart: number = 0, len: number = 1): number {
    if (len === 0) {
      return 0
    }
    if (this.pos + len > this._size) {
      len = this._size - this.pos
    }
    let readLength: number
    if (this.type === BinaryType.FILE) {
      readLength = fs.readSync(this._file!, buf, bufStart, len, this.pos)
    } else {
      readLength = bufferMethods.copy(this._buffer!, buf, bufStart, this.pos, this.pos + len)
    }
    this.pos += readLength
    return readLength
  }

  public readString (encoding: 'ascii' | 'utf8' = 'ascii', length: number = -1): string {
    if (length === 0) {
      return ''
    }
    if (length === -1) {
      let l = 0
      const buf = new Uint8Array(1)
      do {
        let readLength: number
        if (this.type === BinaryType.FILE) {
          readLength = fs.readSync(this._file!, buf, 0, 1, this.pos + l)
        } else {
          readLength = bufferMethods.copy(this._buffer!, buf, 0, this.pos + l, this.pos + l + 1)
        }
        if (readLength === 0) break
        l += readLength
      } while (buf[0] !== 0)
      const r = new Uint8Array(l - 1)
      if (this.type === BinaryType.FILE) {
        fs.readSync(this._file!, r, 0, l - 1, this.pos)
      } else {
        bufferMethods.copy(this._buffer!, r, 0, this.pos, this.pos + l - 1)
      }
      this.pos += l
      return bufferMethods.bufferToString(r, encoding)
    }
    return bufferMethods.bufferToString(this.read(length), encoding)
  }

  public readBoolean (): boolean {
    return this.readUInt8() !== 0
  }

  public readInt8 (): number {
    return readNumber(this, 'readInt8')
  }

  public readUInt8 (): number {
    return readNumber(this, 'readUInt8')
  }

  public readInt16LE (): number {
    return readNumber(this, 'readInt16LE')
  }

  public readUInt16LE (): number {
    return readNumber(this, 'readUInt16LE')
  }

  public readInt16BE (): number {
    return readNumber(this, 'readInt16BE')
  }

  public readUInt16BE (): number {
    return readNumber(this, 'readUInt16BE')
  }

  public readInt32LE (): number {
    return readNumber(this, 'readInt32LE')
  }

  public readUInt32LE (): number {
    return readNumber(this, 'readUInt32LE')
  }

  public readInt32BE (): number {
    return readNumber(this, 'readInt32BE')
  }

  public readUInt32BE (): number {
    return readNumber(this, 'readUInt32BE')
  }

  public readBigInt64LE (): bigint {
    return readNumber(this, 'readBigInt64LE')
  }

  public readBigUInt64LE (): bigint {
    return readNumber(this, 'readBigUInt64LE')
  }

  public readBigInt64BE (): bigint {
    return readNumber(this, 'readBigInt64BE')
  }

  public readBigUInt64BE (): bigint {
    return readNumber(this, 'readBigUInt64BE')
  }

  public readFloatLE (): number {
    return readNumber(this, 'readFloatLE')
  }

  public readFloatBE (): number {
    return readNumber(this, 'readFloatBE')
  }

  public readDoubleLE (): number {
    return readNumber(this, 'readDoubleLE')
  }

  public readDoubleBE (): number {
    return readNumber(this, 'readDoubleBE')
  }

  public readInt16 (): number {
    return this.endian === EndianType.BigEndian ? this.readInt16BE() : this.readInt16LE()
  }

  public readUInt16 (): number {
    return this.endian === EndianType.BigEndian ? this.readUInt16BE() : this.readUInt16LE()
  }

  public readInt32 (): number {
    return this.endian === EndianType.BigEndian ? this.readInt32BE() : this.readInt32LE()
  }

  public readUInt32 (): number {
    return this.endian === EndianType.BigEndian ? this.readUInt32BE() : this.readUInt32LE()
  }

  public readBigInt64 (): bigint {
    return this.endian === EndianType.BigEndian ? this.readBigInt64BE() : this.readBigInt64LE()
  }

  public readBigUInt64 (): bigint {
    return this.endian === EndianType.BigEndian ? this.readBigUInt64BE() : this.readBigUInt64LE()
  }

  public readFloat (): number {
    return this.endian === EndianType.BigEndian ? this.readFloatBE() : this.readFloatLE()
  }

  public readDouble (): number {
    return this.endian === EndianType.BigEndian ? this.readDoubleBE() : this.readDoubleLE()
  }
}

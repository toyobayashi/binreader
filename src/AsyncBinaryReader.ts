import * as bufferMethods from './buffer'
import { Reader, checkRange } from './Reader'
import { fs } from './node'
import { EndianType } from './EndianType'
import { FileDescriptor } from './FileDescriptor'

let onceSupported = false

try {
  const options = Object.defineProperty({}, 'once', {
    get: function () {
      onceSupported = true
    }
  })

  window.addEventListener('test', null as any, options)
} catch (err) {}

const listenerOpts = onceSupported ? { once: true } : false

function fsRead (reader: AsyncBinaryReader, buf: Uint8Array, bufStart: number, len: number, pos: number): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const file: number | File = (reader as any)._file
    if (typeof file === 'number') {
      try {
        resolve(fs.readSync(file, buf, bufStart, len, pos))
      } catch (err) {
        reject(err)
      }
    } else {
      const fr = new FileReader()
      let onError: () => void
      // eslint-disable-next-line prefer-const
      let onLoad: () => void
      // eslint-disable-next-line prefer-const
      onError = () => {
        if (!onceSupported) {
          fr.removeEventListener('error', onError)
          fr.removeEventListener('load', onLoad)
        }
        reject(fr.error)
      }
      // eslint-disable-next-line prefer-const
      onLoad = (): void => {
        if (!onceSupported) {
          fr.removeEventListener('error', onError)
          fr.removeEventListener('load', onLoad)
        }
        const readBuffer = new Uint8Array(fr.result as ArrayBuffer)
        const copied = bufferMethods.copy(readBuffer, buf, bufStart, 0, readBuffer.length)
        resolve(copied)
      }
      fr.addEventListener('error', onError, listenerOpts)
      fr.addEventListener('load', onLoad, listenerOpts)
      fr.readAsArrayBuffer(file.slice(pos, pos + len))
    }
  })
}

const methods = bufferMethods.methods

const enum BinaryType {
  FILE,
  BUFFER
}

function readNumber<Reader extends AsyncBinaryReader> (reader: Reader, method: bufferMethods.MethodsReturnBigInt): Promise<bigint>
function readNumber<Reader extends AsyncBinaryReader> (reader: Reader, method: Exclude<keyof typeof methods, bufferMethods.MethodsReturnBigInt>): Promise<number>
function readNumber<Reader extends AsyncBinaryReader> (reader: Reader, method: keyof typeof methods): Promise<boolean | number | bigint> {
  const promise = new Promise<boolean | number | bigint>((resolve, reject) => {
    checkRange(reader.pos, reader.size)
    if (method === 'readBigInt64BE' || method === 'readBigInt64LE' || method === 'readBigUInt64BE' || method === 'readBigUInt64LE') {
      bufferMethods.validateBigInt()
    }
    const buf = new Uint8Array(methods[method])

    if ((reader as any).type === BinaryType.FILE) {
      fsRead(reader, buf, 0, methods[method], reader.pos).then(readLength => {
        reader.pos += readLength
        resolve(bufferMethods[method](buf, 0))
      }).catch(reject)
    } else {
      const readLength = bufferMethods.copy((reader as any)._buffer, buf, 0, reader.pos, reader.pos + methods[method])
      reader.pos += readLength
      resolve(bufferMethods[method](buf, 0))
    }
  })

  return promise
}

/**
 * @public
 */
export class AsyncBinaryReader extends Reader {
  protected readonly _path: string
  private _buffer: Uint8Array | null
  private _file: number | File | null
  public readonly type!: 0 | 1
  private _opened: boolean

  public endian!: EndianType

  public constructor (fileOrBuffer: string | File | Uint8Array | FileDescriptor, endian: EndianType = EndianType.BigEndian) {
    if (fileOrBuffer instanceof Uint8Array) {
      super(fileOrBuffer.length)
      Object.defineProperty(this, 'type', { configurable: true, enumerable: true, writable: false, value: BinaryType.BUFFER })
      this._path = ''
      this._file = null
      this._buffer = fileOrBuffer
    } else if (typeof fileOrBuffer === 'string') {
      super(fs.statSync(fileOrBuffer).size)
      Object.defineProperty(this, 'type', { configurable: true, enumerable: true, writable: false, value: BinaryType.FILE })
      this._file = fs.openSync(fileOrBuffer, 'r')
      this._path = fileOrBuffer
      this._buffer = null
    } else if (fileOrBuffer instanceof FileDescriptor) {
      super(fileOrBuffer.size)
      Object.defineProperty(this, 'type', { configurable: true, enumerable: true, writable: false, value: BinaryType.FILE })
      this._file = fileOrBuffer.fd
      this._path = fileOrBuffer.path
      this._buffer = null
    } else {
      super(fileOrBuffer.size)
      Object.defineProperty(this, 'type', { configurable: true, enumerable: true, writable: false, value: BinaryType.FILE })
      this._file = fileOrBuffer
      this._path = (fileOrBuffer as any).webkitRelativePath as string || ''
      this._buffer = null
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

  public read (len: number = 1): Promise<Uint8Array> {
    const promise = new Promise<Uint8Array>((resolve, reject) => {
      checkRange(this.pos, this._size)
      if (len === 0) {
        resolve(new Uint8Array(0))
        return
      }
      if (this.pos + len > this._size) {
        len = this._size - this.pos
      }
      if (len === 0) {
        resolve(new Uint8Array(0))
        return
      }
      const buf = new Uint8Array(len)
      if (this.type === BinaryType.FILE) {
        fsRead(this, buf, 0, len, this.pos).then(readLength => {
          this.pos += readLength
          resolve(buf)
        }).catch(reject)
      } else {
        const readLength = bufferMethods.copy(this._buffer!, buf, 0, this.pos, this.pos + len)
        this.pos += readLength
        resolve(buf)
      }
    })

    return promise
  }

  public readToBuffer (buf: Uint8Array, bufStart: number = 0, len: number = 1): Promise<number> {
    const promise = new Promise<number>((resolve, reject) => {
      checkRange(this.pos, this._size)
      if (len === 0) {
        resolve(0)
        return
      }
      if (this.pos + len > this._size) {
        len = this._size - this.pos
      }
      if (len === 0) {
        resolve(0)
        return
      }
      if (this.type === BinaryType.FILE) {
        fsRead(this, buf, bufStart, len, this.pos).then(readLength => {
          this.pos += readLength
          resolve(readLength)
        }).catch(reject)
      } else {
        const readLength = bufferMethods.copy(this._buffer!, buf, bufStart, this.pos, this.pos + len)
        this.pos += readLength
        resolve(readLength)
      }
    })
    return promise
  }

  public async readString (encoding: 'ascii' | 'utf8' = 'ascii', length: number = -1): Promise<string> {
    checkRange(this.pos, this._size)
    if (length === 0) {
      return ''
    }
    if (length === -1) {
      let l = 0
      const buf = new Uint8Array(1)
      do {
        let readLength: number
        if (this.type === BinaryType.FILE) {
          readLength = await fsRead(this, buf, 0, 1, this.pos + l)
        } else {
          readLength = bufferMethods.copy(this._buffer!, buf, 0, this.pos + l, this.pos + l + 1)
        }
        if (readLength === 0) break
        l += readLength
      } while (buf[0] !== 0)
      const r = new Uint8Array(l - 1)
      if (this.type === BinaryType.FILE) {
        await fsRead(this, r, 0, l - 1, this.pos)
      } else {
        bufferMethods.copy(this._buffer!, r, 0, this.pos, this.pos + l - 1)
      }
      this.pos += l
      return bufferMethods.bufferToString(r, encoding)
    }
    return bufferMethods.bufferToString(await this.read(length), encoding)
  }

  public readBoolean (): Promise<boolean> {
    return this.readUInt8().then(u8 => (u8 !== 0))
  }

  public readInt8 (): Promise<number> {
    return readNumber(this, 'readInt8')
  }

  public readUInt8 (): Promise<number> {
    return readNumber(this, 'readUInt8')
  }

  public readInt16LE (): Promise<number> {
    return readNumber(this, 'readInt16LE')
  }

  public readUInt16LE (): Promise<number> {
    return readNumber(this, 'readUInt16LE')
  }

  public readInt16BE (): Promise<number> {
    return readNumber(this, 'readInt16BE')
  }

  public readUInt16BE (): Promise<number> {
    return readNumber(this, 'readUInt16BE')
  }

  public readInt32LE (): Promise<number> {
    return readNumber(this, 'readInt32LE')
  }

  public readUInt32LE (): Promise<number> {
    return readNumber(this, 'readUInt32LE')
  }

  public readInt32BE (): Promise<number> {
    return readNumber(this, 'readInt32BE')
  }

  public readUInt32BE (): Promise<number> {
    return readNumber(this, 'readUInt32BE')
  }

  public readBigInt64LE (): Promise<bigint> {
    return readNumber(this, 'readBigInt64LE')
  }

  public readBigUInt64LE (): Promise<bigint> {
    return readNumber(this, 'readBigUInt64LE')
  }

  public readBigInt64BE (): Promise<bigint> {
    return readNumber(this, 'readBigInt64BE')
  }

  public readBigUInt64BE (): Promise<bigint> {
    return readNumber(this, 'readBigUInt64BE')
  }

  public readFloatLE (): Promise<number> {
    return readNumber(this, 'readFloatLE')
  }

  public readFloatBE (): Promise<number> {
    return readNumber(this, 'readFloatBE')
  }

  public readDoubleLE (): Promise<number> {
    return readNumber(this, 'readDoubleLE')
  }

  public readDoubleBE (): Promise<number> {
    return readNumber(this, 'readDoubleBE')
  }

  public readInt16 (): Promise<number> {
    return this.endian === EndianType.BigEndian ? this.readInt16BE() : this.readInt16LE()
  }

  public readUInt16 (): Promise<number> {
    return this.endian === EndianType.BigEndian ? this.readUInt16BE() : this.readUInt16LE()
  }

  public readInt32 (): Promise<number> {
    return this.endian === EndianType.BigEndian ? this.readInt32BE() : this.readInt32LE()
  }

  public readUInt32 (): Promise<number> {
    return this.endian === EndianType.BigEndian ? this.readUInt32BE() : this.readUInt32LE()
  }

  public readBigInt64 (): Promise<bigint> {
    return this.endian === EndianType.BigEndian ? this.readBigInt64BE() : this.readBigInt64LE()
  }

  public readBigUInt64 (): Promise<bigint> {
    return this.endian === EndianType.BigEndian ? this.readBigUInt64BE() : this.readBigUInt64LE()
  }

  public readFloat (): Promise<number> {
    return this.endian === EndianType.BigEndian ? this.readFloatBE() : this.readFloatLE()
  }

  public readDouble (): Promise<number> {
    return this.endian === EndianType.BigEndian ? this.readDoubleBE() : this.readDoubleLE()
  }
}

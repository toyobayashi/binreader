import * as bufferMethods from './buffer'
import { Reader } from './Reader'
import { fs } from './node'

let onceSupported = false

try {
  var options = Object.defineProperty({}, 'once', {
    get: function () {
      onceSupported = true
    }
  })

  window.addEventListener('test', null as any, options)
} catch (err) {}

const listenerOpts = onceSupported ? { once: true } : false

function fsRead (file: number | File, buf: Uint8Array, bufStart: number, len: number, pos: number): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    if (typeof file === 'number') {
      fs.read(file, buf, bufStart, len, pos, (err, bytesRead) => {
        if (err) {
          reject(err)
        } else {
          resolve(bytesRead)
        }
      })
    } else {
      const fr = new FileReader()
      fr.addEventListener('error', () => { reject(fr.error) }, listenerOpts)
      fr.addEventListener('load', () => {
        const readBuffer = new Uint8Array(fr.result as ArrayBuffer)
        const copied = bufferMethods.copy(readBuffer, buf, bufStart, 0, readBuffer.length)
        resolve(copied)
      }, listenerOpts)
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
    if (method === 'readBigInt64BE' || method === 'readBigInt64LE' || method === 'readBigUInt64BE' || method === 'readBigUInt64LE') {
      try {
        bufferMethods.validateBigInt()
      } catch (error) {
        reject(error)
        return
      }
    }
    const buf = new Uint8Array(methods[method])

    if ((reader as any).type === BinaryType.FILE) {
      fsRead((reader as any)._file, buf, 0, methods[method], reader.pos).then(readLength => {
        reader.pos += readLength
        resolve(bufferMethods[method](buf, 0))
      }).catch(reject)
    } else {
      const readLength = bufferMethods.copy((reader as any)._buffer, buf, 0, reader.pos, reader.pos + methods[method])
      reader.pos += readLength
      resolve(bufferMethods[method](buf, 0))
    }
  })
  const _reader: any = reader
  _reader._readPromise = Promise.resolve(_reader._readPromise)
    .then(() => promise)
    .then((value) => {
      _reader._readPromise = null
      return value
    })
  return _reader._readPromise
}

/**
 * @public
 */
export class AsyncBinaryReader extends Reader {
  protected readonly _path: string
  private _buffer: Uint8Array | null
  private _file: number | File | null
  public readonly type!: 0 | 1
  private _readPromise: Promise<any> | null
  private _opened: boolean

  public constructor (fileOrBuffer: string | File | Uint8Array) {
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
    } else {
      super(fileOrBuffer.size)
      Object.defineProperty(this, 'type', { configurable: true, enumerable: true, writable: false, value: BinaryType.FILE })
      this._file = fileOrBuffer
      this._path = (fileOrBuffer as any).webkitRelativePath as string || ''
      this._buffer = null
    }
    this._readPromise = null
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
      this._readPromise = null
      this._opened = false
    }
  }

  public read (len: number = 1): Promise<Uint8Array> {
    const promise = new Promise<Uint8Array>((resolve, reject) => {
      if (this.pos + len > this._size) {
        len = this._size - this.pos
      }
      const buf = new Uint8Array(len)
      if (this.type === BinaryType.FILE) {
        fsRead(this._file!, buf, 0, len, this.pos).then(readLength => {
          this.pos += readLength
          resolve(buf)
        }).catch(reject)
      } else {
        const readLength = bufferMethods.copy(this._buffer!, buf, 0, this.pos, this.pos + len)
        this.pos += readLength
        resolve(buf)
      }
    })
    this._readPromise = Promise.resolve(this._readPromise)
      .then(() => promise)
      .then((value) => {
        this._readPromise = null
        return value
      })
    return this._readPromise
  }

  public readToBuffer (buf: Uint8Array, bufStart: number = 0, len: number = 1): Promise<number> {
    const promise = new Promise<number>((resolve, reject) => {
      if (this.pos + len > this._size) {
        len = this._size - this.pos
      }
      if (this.type === BinaryType.FILE) {
        fsRead(this._file!, buf, bufStart, len, this.pos).then(readLength => {
          this.pos += readLength
          resolve(readLength)
        }).catch(reject)
      } else {
        const readLength = bufferMethods.copy(this._buffer!, buf, bufStart, this.pos, this.pos + len)
        this.pos += readLength
        resolve(readLength)
      }
    })
    this._readPromise = Promise.resolve(this._readPromise)
      .then(() => promise)
      .then((value) => {
        this._readPromise = null
        return value
      })
    return this._readPromise
  }

  private async _readString (encoding: 'ascii' | 'utf8' = 'ascii', length: number = -1): Promise<string> {
    if (length === -1) {
      let l = 0
      const buf = new Uint8Array(1)
      do {
        let readLength: number
        if (this.type === BinaryType.FILE) {
          readLength = await fsRead(this._file!, buf, 0, 1, this.pos + l)
        } else {
          readLength = bufferMethods.copy(this._buffer!, buf, 0, this.pos + l, this.pos + l + 1)
        }
        if (readLength === 0) break
        l += readLength
      } while (buf[0] !== 0)
      const r = new Uint8Array(l - 1)
      if (this.type === BinaryType.FILE) {
        await fsRead(this._file!, r, 0, l - 1, this.pos)
      } else {
        bufferMethods.copy(this._buffer!, r, 0, this.pos, this.pos + l - 1)
      }
      this.pos += l
      return bufferMethods.bufferToString(r, encoding)
    }
    return bufferMethods.bufferToString(await this.read(length), encoding)
  }

  public readString (encoding: 'ascii' | 'utf8' = 'ascii', length: number = -1): Promise<string> {
    this._readPromise = Promise.resolve(this._readPromise)
      .then(() => this._readString(encoding, length))
      .then((value) => {
        this._readPromise = null
        return value
      })
    return this._readPromise
  }

  public readBoolean (): Promise<boolean> {
    this._readPromise = Promise.resolve(this._readPromise)
      .then(() => this.readUInt8().then(u8 => (u8 !== 0)))
      .then((value) => {
        this._readPromise = null
        return value
      })
    return this._readPromise
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
}

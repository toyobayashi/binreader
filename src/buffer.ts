/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */

// nodejs 14.13.1

import { _Buffer } from './node'

const float32Array = new Float32Array(1)
const uInt8Float32Array = new Uint8Array(float32Array.buffer)
const float64Array = new Float64Array(1)
const uInt8Float64Array = new Uint8Array(float64Array.buffer)

float32Array[0] = -1 // 0xBF800000
const bigEndian: boolean = uInt8Float32Array[3] === 0

export function validateBigInt (): void {
  if (typeof BigInt !== 'function') throw new Error('BigInt is not available')
}

function validateNumber (value: unknown, name?: string): void {
  if (typeof value !== 'number') { throw new TypeError(`${name || 'offset'} should be a number`) }
}

function boundsError (value: number, length: number, type?: string): void {
  if (Math.floor(value) !== value) {
    validateNumber(value, type)
    throw new RangeError(`${type || 'offset'} should be an integer`)
  }

  if (length < 0) { throw new RangeError('Attempt to access memory outside buffer bounds') }

  throw new RangeError(`${type || 'offset'} should be >= ${type ? 1 : 0} and <= ${length}`)
}

export function readBigUInt64LE (buf: Uint8Array, offset = 0): bigint {
  validateBigInt()
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 7]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 8) }

  const lo = first +
    buf[++offset] * 2 ** 8 +
    buf[++offset] * 2 ** 16 +
    buf[++offset] * 2 ** 24

  const hi = buf[++offset] +
    buf[++offset] * 2 ** 8 +
    buf[++offset] * 2 ** 16 +
    last * 2 ** 24

  return BigInt(lo) + (BigInt(hi) << BigInt(32))
}

export function readBigUInt64BE (buf: Uint8Array, offset = 0): bigint {
  validateBigInt()
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 7]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 8) }

  const hi = first * 2 ** 24 +
    buf[++offset] * 2 ** 16 +
    buf[++offset] * 2 ** 8 +
    buf[++offset]

  const lo = buf[++offset] * 2 ** 24 +
    buf[++offset] * 2 ** 16 +
    buf[++offset] * 2 ** 8 +
    last

  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
}

export function readBigInt64LE (buf: Uint8Array, offset = 0): bigint {
  validateBigInt()
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 7]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 8) }

  const val = buf[offset + 4] +
    buf[offset + 5] * 2 ** 8 +
    buf[offset + 6] * 2 ** 16 +
    (last << 24) // Overflow
  return (BigInt(val) << BigInt(32)) +
    BigInt(first +
    buf[++offset] * 2 ** 8 +
    buf[++offset] * 2 ** 16 +
    buf[++offset] * 2 ** 24)
}

export function readBigInt64BE (buf: Uint8Array, offset = 0): bigint {
  validateBigInt()
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 7]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 8) }

  const val = (first << 24) + // Overflow
    buf[++offset] * 2 ** 16 +
    buf[++offset] * 2 ** 8 +
    buf[++offset]
  return (BigInt(val) << BigInt(32)) +
    BigInt(buf[++offset] * 2 ** 24 +
    buf[++offset] * 2 ** 16 +
    buf[++offset] * 2 ** 8 +
    last)
}

export function readUInt32LE (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 3]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 4) }

  return first +
    buf[++offset] * 2 ** 8 +
    buf[++offset] * 2 ** 16 +
    last * 2 ** 24
}

export function readUInt16LE (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 1]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 2) }

  return first + last * 2 ** 8
}

export function readUInt8 (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const val = buf[offset]
  if (val === undefined) { boundsError(offset, buf.length - 1) }

  return val
}

export function readUInt32BE (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 3]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 4) }

  return first * 2 ** 24 +
    buf[++offset] * 2 ** 16 +
    buf[++offset] * 2 ** 8 +
    last
}

export function readUInt16BE (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 1]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 2) }

  return first * 2 ** 8 + last
}

export function readInt32LE (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 3]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 4) }

  return first +
    buf[++offset] * 2 ** 8 +
    buf[++offset] * 2 ** 16 +
    (last << 24) // Overflow
}

export function readInt16LE (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 1]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 2) }

  const val = first + last * 2 ** 8
  return val | (val & 2 ** 15) * 0x1fffe
}

export function readInt8 (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const val = buf[offset]
  if (val === undefined) { boundsError(offset, buf.length - 1) }

  return val | (val & 2 ** 7) * 0x1fffffe
}

export function readInt32BE (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 3]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 4) }

  return (first << 24) + // Overflow
    buf[++offset] * 2 ** 16 +
    buf[++offset] * 2 ** 8 +
    last
}

export function readInt16BE (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 1]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 2) }

  const val = first * 2 ** 8 + last
  return val | (val & 2 ** 15) * 0x1fffe
}

// Read floats
export function readFloatBackwards (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 3]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 4) }

  uInt8Float32Array[3] = first
  uInt8Float32Array[2] = buf[++offset]
  uInt8Float32Array[1] = buf[++offset]
  uInt8Float32Array[0] = last
  return float32Array[0]
}

export function readFloatForwards (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 3]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 4) }

  uInt8Float32Array[0] = first
  uInt8Float32Array[1] = buf[++offset]
  uInt8Float32Array[2] = buf[++offset]
  uInt8Float32Array[3] = last
  return float32Array[0]
}

function readDoubleBackwards (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 7]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 8) }

  uInt8Float64Array[7] = first
  uInt8Float64Array[6] = buf[++offset]
  uInt8Float64Array[5] = buf[++offset]
  uInt8Float64Array[4] = buf[++offset]
  uInt8Float64Array[3] = buf[++offset]
  uInt8Float64Array[2] = buf[++offset]
  uInt8Float64Array[1] = buf[++offset]
  uInt8Float64Array[0] = last
  return float64Array[0]
}

function readDoubleForwards (buf: Uint8Array, offset = 0): number {
  validateNumber(offset, 'offset')
  const first = buf[offset]
  const last = buf[offset + 7]
  if (first === undefined || last === undefined) { boundsError(offset, buf.length - 8) }

  uInt8Float64Array[0] = first
  uInt8Float64Array[1] = buf[++offset]
  uInt8Float64Array[2] = buf[++offset]
  uInt8Float64Array[3] = buf[++offset]
  uInt8Float64Array[4] = buf[++offset]
  uInt8Float64Array[5] = buf[++offset]
  uInt8Float64Array[6] = buf[++offset]
  uInt8Float64Array[7] = last
  return float64Array[0]
}

export const readFloatLE = bigEndian ? readFloatBackwards : readFloatForwards
export const readFloatBE = bigEndian ? readFloatForwards : readFloatBackwards
export const readDoubleLE = bigEndian ? readDoubleBackwards : readDoubleForwards
export const readDoubleBE = bigEndian ? readDoubleForwards : readDoubleBackwards

export function copy (source: Uint8Array, target: Uint8Array, targetStart: number = 0, sourceStart: number = 0, sourceEnd: number = source.length): number {
  if (!(source instanceof Uint8Array)) { throw new TypeError('source shoule be a Uint8Array') }
  if (!(target instanceof Uint8Array)) { throw new TypeError('target shoule be a Uint8Array') }

  if (targetStart === undefined) {
    targetStart = 0
  } else {
    targetStart = toInteger(targetStart, 0)
    if (targetStart < 0) { throw new RangeError('targetStart should be >= 0') }
  }

  if (sourceStart === undefined) {
    sourceStart = 0
  } else {
    sourceStart = toInteger(sourceStart, 0)
    if (sourceStart < 0) { throw new RangeError('sourceStart should be >= 0') }
  }

  if (sourceEnd === undefined) {
    sourceEnd = source.length
  } else {
    sourceEnd = toInteger(sourceEnd, 0)
    if (sourceEnd < 0) { throw new RangeError('sourceEnd should be >= 0') }
  }

  if (targetStart >= target.length || sourceStart >= sourceEnd) { return 0 }

  if (sourceStart > source.length) {
    throw new RangeError(`sourceStart should be <= ${source.length}`)
  }

  return _copyActual(source, target, targetStart, sourceStart, sourceEnd)
}

function _copyActual (source: Uint8Array, target: Uint8Array, targetStart: number, sourceStart: number, sourceEnd: number): number {
  if (sourceEnd - sourceStart > target.length - targetStart) { sourceEnd = sourceStart + target.length - targetStart }

  let nb = sourceEnd - sourceStart
  const targetLen = target.length - targetStart
  const sourceLen = source.length - sourceStart
  if (nb > targetLen) { nb = targetLen }
  if (nb > sourceLen) { nb = sourceLen }

  if (sourceStart !== 0 || sourceEnd < source.length) { source = new Uint8Array(source.buffer, source.byteOffset + sourceStart, nb) }

  target.set(source, targetStart)

  return nb
}

function toInteger (n: number, defaultVal: number): number {
  n = +n
  if (!Number.isNaN(n) &&
      n >= Number.MIN_SAFE_INTEGER &&
      n <= Number.MAX_SAFE_INTEGER) {
    return ((n % 1) === 0 ? n : Math.floor(n))
  }
  return defaultVal
}

export function bufferToString (buf: Uint8Array, encoding?: 'ascii' | 'utf8', start?: number, end?: number): string {
  if (_Buffer !== null) {
    return _Buffer.from(buf).toString(encoding, start, end)
  }
  if (arguments.length === 0) {
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(buf.subarray(0, buf.length))
  }

  const len = buf.length

  if (start! <= 0) { start = 0 } else if (start! >= len) { return '' } else { start! |= 0 }

  if (end === undefined || end > len) { end = len } else { end |= 0 }

  if (end <= start!) { return '' }

  if (encoding === undefined) {
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(buf.subarray(start, end))
  }

  const decoder = new TextDecoder(encoding)
  return decoder.decode(buf.subarray(start, end))
}

export const methods = {
  readInt8: 1,
  readUInt8: 1,
  readInt16LE: 2,
  readUInt16LE: 2,
  readInt16BE: 2,
  readUInt16BE: 2,
  readInt32LE: 4,
  readUInt32LE: 4,
  readInt32BE: 4,
  readUInt32BE: 4,
  readBigInt64LE: 8,
  readBigUInt64LE: 8,
  readBigInt64BE: 8,
  readBigUInt64BE: 8,
  readFloatLE: 4,
  readFloatBE: 4,
  readDoubleLE: 8,
  readDoubleBE: 8
}

export type MethodsReturnBigInt = 'readBigInt64LE' | 'readBigUInt64LE' | 'readBigInt64BE' | 'readBigUInt64BE'

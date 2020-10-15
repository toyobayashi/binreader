import { tryGetRequireFunction } from '@tybys/native-require'

const _require = tryGetRequireFunction()

export const fs: typeof import('fs') = (function () {
  try {
    return _require!('fs')
  } catch (_) {
    const message = 'Node.js API is not supported'
    return {
      readSync () { throw new Error(message) },
      statSync () { throw new Error(message) },
      openSync () { throw new Error(message) },
      closeSync () {},
      read (_fd: number, ...args: any[]) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        Promise.resolve().then(() => {
          let callback: Function | null = null
          for (let i = 0; i < args.length; i++) {
            if (typeof args[i] === 'function') {
              callback = args[i]
              break
            }
          }
          if (callback !== null) {
            callback(new Error(message))
          }
        })
      },
      promises: {
        read () {
          return Promise.reject(new Error(message))
        }
      }
    }
  }
})()

export const _Buffer: null | typeof Buffer = (function () {
  try {
    return _require!('buffer').Buffer
  } catch (_) {
    return null
  }
})()

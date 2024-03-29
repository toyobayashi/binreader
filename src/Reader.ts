export function checkRange (pos: number, size: number): void {
  if (pos < 0 || pos > size) {
    throw new RangeError(`Position (${pos}) out of range: [0, ${size}]`)
  }
}

/** @public */
export abstract class Reader {
  /**
   * Size of binary.
   */
  protected readonly _size: number

  /**
   * Current position.
   */
  public pos!: number

  /**
   * Throws RangeError if position is out of range when set this to `true`
   */
  public strictRangeChecking = false

  protected constructor (size: number = 0) {
    size = size < 0 ? 0 : size
    this._size = size

    let pos = 0
    Object.defineProperty(this, 'pos', {
      configurable: true,
      enumerable: true,
      get: () => pos,
      set: (v: number) => {
        if (typeof v !== 'number' || Number.isNaN(v)) {
          throw new TypeError('Invalid position')
        }
        if (this.strictRangeChecking) {
          checkRange(v, this._size)
        }
        pos = v

        // let message: string
        // if (v < 0) {
        //   message = `Position out of range: ${v} < 0`
        //   if (!this.strictRangeChecking) {
        //     console.warn(`${message}, set position to 0`)
        //     pos = 0
        //     return
        //   }
        //   throw new RangeError(message)
        // }
        // if (v > this._size) {
        //   message = `Position out of range: ${v} > ${this._size}`
        //   if (!this.strictRangeChecking) {
        //     console.warn(`${message}, set position to the end`)
        //     pos = this._size
        //     return
        //   }
        //   throw new RangeError(message)
        // }
        // pos = v
      }
    })
  }

  public get size (): number {
    return this._size
  }

  /**
   * Set current position.
   * @param pos - Target position
   */
  public seek (pos: number): void {
    this.pos = pos
  }

  /**
   * Get current position
   */
  public tell (): number {
    return this.pos
  }

  public abstract close (): void

  /**
   * Destructor.
   * @virtual
   */
  public dispose (): void {
    this.close()
  }
}

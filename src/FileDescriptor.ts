/** @public */
export class FileDescriptor {
  public constructor (
    public fd: number,
    public size: number,
    public path: string
  ) {}
}

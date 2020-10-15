const { AsyncBinaryReader, BinaryReader } = require('..')

const file = 'C:\\Program Files (x86)\\MapleRoyals800x600\\Map.wz'

function mainSync () {
  const reader = new BinaryReader(file)
  const buf = reader.read(4)
  console.log(buf)
  console.log(Buffer.from(buf).toString('ascii'))
  const size = reader.readBigUInt64LE()
  console.log(size)
  const fstart = reader.readUInt32LE()
  console.log(fstart)
  const copyright = reader.readString()
  console.log(copyright)
  reader.dispose()
}

async function main () {
  const reader = new AsyncBinaryReader(file)
  const buf = await reader.read(4)
  console.log(buf)
  console.log(Buffer.from(buf).toString('ascii'))
  const size = await reader.readBigUInt64LE()
  console.log(size)
  const fstart = await reader.readUInt32LE()
  console.log(fstart)
  const copyright = await reader.readString()
  console.log(copyright)
  reader.dispose()

  mainSync()
}

main()


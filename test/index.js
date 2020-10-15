/// <reference path="../dist/binreader.d.ts" />

(function () {

  const input = document.getElementById('file')

  input.addEventListener('change', async (e) => {
    console.log(e.target.files[0])
    const f = e.target.files[0]
    const reader = new binreader.AsyncBinaryReader(f)
    const buf = await reader.read(4)
    console.log(buf)
    const decoder = new TextDecoder('ascii')
    console.log(decoder.decode(buf))
    const size = await reader.readBigUInt64LE()
    console.log(size)
    const fstart = await reader.readUInt32LE()
    console.log(fstart)
    const copyright = await reader.readString()
    console.log(copyright)
    reader.dispose()
  })

})()

# binreader

Binary reader for Node.js and browser.

[API Documentation](https://github.com/toyobayashi/binreader/blob/main/docs/api/index.md)

## Usage

Browser

``` html
<input type="file" id="file">

<script src="node_modules/@tybys/binreader/dist/binreader.js"></script>
```

``` js
/// <reference path="node_modules/@tybys/binreader/dist/binreader.d.ts" />

(function () {
  var input = document.getElementById('file');

  input.addEventListener('change', async (e) => {
    console.log(e.target.files[0]);
    var f = e.target.files[0];
    var reader = new binreader.AsyncBinaryReader(f);
    var buf = await reader.read(4);
    console.log(buf);
    var decoder = new TextDecoder('ascii');
    console.log(decoder.decode(buf));
    var size = await reader.readBigUInt64LE();
    console.log(size);
    var fstart = await reader.readUInt32LE();
    console.log(fstart);
    var copyright = await reader.readString();
    console.log(copyright);
    reader.dispose();
  });
})();
```

Node.js

``` js
const { BinaryReader } = require('@tybys/binreader')
const reader = new BinaryReader('file/path')
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
```

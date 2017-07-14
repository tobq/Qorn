var iter = 10000000,
    buffers = [require("crypto").randomBytes(10000), require("crypto").randomBytes(10000)];
//console.time("bubble x" + iter);
//for (var i = iter; i--;) array.slice().bubbleSort();
//console.timeEnd("bubble x" + iter);

//console.time("insertion x" + iter);
//for (var i = iter; i--;) array.slice().insertionSort();
//console.timeEnd("insertion x" + iter);

class BitField {
    constructor(size) {
        this._field = Buffer.alloc(~~(size / 8) + (size % 8 ? 1 : 0));
    }
    on(i) {
        this._field[i >> 3] |= 128 >> (i % 8);
    }
    off(i) {
        this._field[i >> 3] &= ~(128>> (i % 8));
    }
    get(i) {
        return !!(this._field[~~(i / 8)] && 128 >> (i % 8));
    }
}

var bf = new BitField(16);


console.time("from x" + iter);
for (var i = iter; i--;) bf.on(8);
console.timeEnd("from x" + iter)
console.log(bf._field.join(" "));


console.time("write x" + iter);
for (var i = iter; i--;) bf.off(8);
console.timeEnd("write x" + iter)

console.log(bf._field.join(" "));










var bf = new require("bitfield")(16);

console.time("from x" + iter);
for (var i = iter; i--;) bf.set(8, true);
console.timeEnd("from x" + iter)
console.log(bf);


console.time("write x" + iter);
for (var i = iter; i--;) bf.set(8, false);
console.timeEnd("write x" + iter)

console.log(bf);
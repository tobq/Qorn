Array.prototype.mergeSort = function () {
    if (this.length > 1) {
        var l = this.length,
            mp = ~~(l / 2),
            a = this.slice(0, mp).mergeSort(),
            b = this.slice(mp, array.length).mergeSort(),
            A = a.length - 1,
            B = b.length - 1;
        while (l--) {
            if (A < 0) this[l] = b[B--]
            else if (B < 0) this[l] = a[A--]
            else {
                var _a = a[A],
                    _b = b[B];

                if (_a > _b) {
                    this[l] = _a;
                    A--;
                } else {
                    this[l] = _b;
                    B--;
                }
            }
        }
    }
    return this;
}


Array.prototype.insertionSort = function () {
    for (var i = 1, s, temp; i < this.length; i++) {
        temp = this[s = i];
        while (s && temp < this[s - 1]) this[s] = this[--s];
        this[s] = temp;
    }
    return this
}

Array.prototype.quickSort = function () {
    var swapped = true;
    while (swapped) {
        swapped = false;
        for (var i = 0; i < this.length - 1; i++) if (this[i] > this[i + 1]) {
            var temp = this[i];
            this[i] = this[i + 1];
            this[i + 1] = temp;
            swapped = true;
        }
    }
    return this;
}

Array.prototype.

Array.prototype.bubbleSort = function () {
    var swapped = true;
    while (swapped) {
        swapped = false;
        for (var i = 0; i < this.length - 1; i++) if (this[i] > this[i + 1]) {
            var temp = this[i];
            this[i] = this[i + 1];
            this[i + 1] = temp;
            swapped = true;
        }
    }
    return this;
}

var iter = 1,
    len = 100000,
    array = [...require("crypto").randomBytes(len)];

console.log(len + " elements");

console.time("bubble x" + iter);
for (var i = iter; i--;) array.slice().bubbleSort();
console.timeEnd("bubble x" + iter);

console.time("insertion x" + iter);
for (var i = iter; i--;) array.slice().insertionSort();
console.timeEnd("insertion x" + iter);

console.time("mergeSort x" + iter);
for (var i = iter; i--;) array.slice().mergeSort();
console.timeEnd("mergeSort x" + iter);

console.time("quickSort x" + iter);
for (var i = iter; i--;) array.slice().quickSort();
console.timeEnd("quickSort x" + iter);
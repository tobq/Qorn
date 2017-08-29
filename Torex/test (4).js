let x = Buffer.from([1, 1, 1, 1]),
    y = Buffer.from([0, 0, 0, 0, 0]);

x.copy(y, 0, 0, 3);
console.log(y);
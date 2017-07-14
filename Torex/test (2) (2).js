require("net").createConnection(1267,s => {
    console.log("Connection :", s.remoteAddress);
    s.on('data', data =>
        console.log("Data :", s.remoteAddress,":",data)
    );
    s.on('error', ()=>
        console.log("Error :", s.remoteAddress)
    );
})
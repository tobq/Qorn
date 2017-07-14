"use strict";

const mime = require('mime'),
    client = new (require("./Torex")),
    http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    streams = {},
    port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 80;

http.createServer((req, res) => {
    let filename = url.parse(req.url).pathname;
    if (filename === "/") filename += 'index.html';
    console.log(req.method, filename);
    let filepath = path.join(__dirname, "public", filename);

    fs.exists(filepath, e => {
        if (e) return fs.readFile(filepath, (err, data) => {
            if (err) res.writeHead(500, { "Content-Type": "text/plain" });
            else {
                res.writeHead(200, { "Content-Type": mime.lookup(filename) });
                res.write(data);
            }
            res.end();
        });

        req.IP = req.headers['X-Forwarded-For'] || req.connection.remoteAddress;
        if (req.method === "POST") {
            req.body = '';
            req.on('data', data => {
                if (req.body.length + data > 1e3) {
                    res = null;
                    req.connection.destroy();
                    req = null;
                    return 
                }
                req.body += data;
            });
            req.on('end', () => {
                try {
                    req.body = JSON.parse(req.body);
                    console.log("POST - Data ::", req.body);
                    if (req.body.i && req.IP) {
                        client.addTorrent(req.body.i, (err, torrent) => {
                            if (err) {
                                res.writeHead(404);
                                return res.end();
                            }
                            console.log(torrent.video);
                            res.writeHead(200);
                            res.end();
                            streams[req.IP] = torrent;
                        });
                    } else throw new Error("NO STREAM FOR IP:", req.IP);
                } catch (err) {
                    console.log("ERR:", err);
                    res.writeHead(404);
                    return res.end();
                };
            })
        } else {
            if (filename === "/play" && req.IP in streams) {
                let stream = streams[req.IP],
                    total = stream.video.length,
                    start = 0,
                    end = total - 1,
                    header = {
                        "Content-Length": total,
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "Content-Type": mime.lookup(stream.video.name)
                    };

                if (req.headers.range) {
                    let range = req.headers.range.split("=")[1].split("-");
                    start = parseInt(range[0], 10);
                    end = Math.min(parseInt(range[1], 10) || total, total) - 1;
                    header["Content-Length"] = (end - start) + 1;
                    header["Content-Range"] = "bytes " + start + "-" + end + "/" + total;
                    header["Accept-Ranges"] = "bytes";
                    res.writeHead(206, header);
                } else res.writeHead(200, header);

                stream.pipe(req, res, start, end);
            }
            else {
                res.writeHead(404);
                return res.end();
            }
        }
    });
}).listen(port);

// TODO: single concurrent
// TODO: limit rate
// TODO: read video stream info


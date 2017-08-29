"use strict";

const mime = require('mime'),
    Torex = require("./Torex"),
    http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    streams = {},
    PORT = 443 || process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 80,
    client = new Torex({
        port: PORT,
        //address: process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1",
    }, function () {

        http.createServer((req, res) => {
            let reqPath = url.parse(req.url).pathname;
            if (reqPath === "/") reqPath += 'index.html';
            console.log(req.method, reqPath);
            let filepath = path.join(__dirname, "public", reqPath);

            fs.exists(filepath, e => {
                if (e) return fs.readFile(filepath, (err, data) => {
                    if (err) res.writeHead(500, { "Content-Type": "text/plain" });
                    else {
                        res.writeHead(200, { "Content-Type": mime.lookup(reqPath) });
                        res.write(data);
                    }
                    res.end();
                });

                req.IP = req.headers['X-Forwarded-For'] || req.connection.remoteAddress;

                if (reqPath.startsWith("/play/")) {
                    let hash = reqPath.slice(6);

                    if (!(hash in streams)) {
                        try {
                            client.addTorrent(hash, (err, torrent) => {
                                if (err) {
                                    res.writeHead(404);
                                    return res.end();
                                }
                                streams[hash] = torrent;
                                console.log(req.IP, torrent.video);
                                PIPE(hash, req, res);
                            });
                        } catch (err) {
                            console.log("ERR:", err);
                            res.writeHead(404);
                            return res.end();
                        };
                    }
                    else PIPE(hash, req, res);
                }
                else {
                    res.writeHead(404);
                    return res.end();
                }
            });
        }).listen(PORT);
    });

function PIPE(hash, req, res) {
    let stream = streams[hash],
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

// TODO: single concurrent
// TODO: limit rate
// TODO: read video stream info


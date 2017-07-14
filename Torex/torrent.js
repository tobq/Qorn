"use strict";

const Peer = require('./peer');
const bencode = require("bencode");
const crypto = require("crypto");
const FILETYPES = [".3gp", ".mov", ".mp4", ".m4v", ".m4a", ".mp3", ".mkv", ".ogv", ".ogm", ".ogg", ".oga", ".webm", ".wav"];


class Torrent extends require("events").EventEmitter {
    constructor(h, opts, client) {
        if (!h) throw new Error("Provide an info hash");
        if (h.length !== 40) throw new Error("Invalid info hash");
        if (!client) throw new Error("A Torrent must be initialised with a Client");
        super();
        this._client = client;
        if (!opts) opts = {};
        this.infoHashHex = h;
        this.infoHash = Buffer.from(h, "hex");
        this.peers = {};
        this._pipes = {}
    }
}
Torrent.prototype.addPeer = function (_peer) {
    let IP = _peer.slice(0, 4).join(".");
    if (IP in this.peers) this.peers[IP].destroy();
    let peer = new Peer(_peer, this);
    //this.peers[IP].on("connect", () => {
    //    console.log("TCP - Hooked up:", IP + ":" + this.peers[IP].port);
    //});
    return this.peers[IP] = peer;
}
Torrent.prototype._peerInfoCB = function (info, IP) {
    if (!this.ready) {
        let sha = crypto.createHash('sha1').update(info).digest();
        for (let i = this.infoHash.length; i--;)
            if (sha[i] !== this.infoHash[i]) return this.peers[IP].destroy();
        info = bencode.decode(info);
        console.log(info);
        if (info.length) {
            for (let ft = FILETYPES.length; ft--;)
                if (info.name.toString().toLowerCase().endsWith(FILETYPES[ft]))
                    this.video = {
                        name: info.name.toString(),
                        length: info.length,
                        offset: 0
                    }
        }
        else if (info.files) {
            LOOP:
            for (let i = info.files.length; i--;) for (let ft = FILETYPES.length; ft--;)
                if (info.files[i].path.toString().toLowerCase().endsWith(FILETYPES[ft])) {
                    let offset = 0, j = i;
                    while (j--) offset += info.files[j].length;
                    this.video = {
                        name: info.files[i].path.toString(),
                        length: info.files[i].length,
                        offset: offset,
                    }
                    break LOOP;
                }
        }

        if (this.video === undefined) {
            this.emit("ready", new Error("Invalid video"), this);
            return this.destroy();
        }
        this.ready = true;
        this.video.pieceLength = info["piece length"];
        this.video.pieces = info.pieces;
        this.video.pieceCount = info.pieces.length / 20;
        this.emit("ready", null, this);
    }
};
Torrent.prototype._peerDestroyCB = function (IP) {
    if (this._destroyed) return;
    //console.log('TCP - Closed:', IP + ":" + this.peers[IP].port, ">>", Object.keys(this.peers).length, "left");
    this.peers[IP] = null;
    delete this.peers[IP];
}
Torrent.prototype.pipe = function (req, res, start, end) {
    if (!res) throw new Error("Torrent require response object in order to be piped");
    req.on("close", function () {
        this._pipes[req.IP].close = true;
        console.log("PIPE CLOSED :::::::::::::::::::::::::");
    }.bind(this));
    this.res = res;
    this._pipes[req.IP] = {
        end: (end || this.video.length - 1) + this.video.offset,
        close: false,
        res: res,
        Length: Math.min(2 ** 14, this.video.pieceLength)
    }
    this._stream(req.IP, (start || 0) + this.video.offset);
}
Torrent.prototype._stream = function (IP, start) {
    let pipe = this._pipes[IP],
        pieceNotFound = true;
    pipe.start = start || this._pipes[IP].start || 0;
    pipe.Piece = ~~(start / this.video.pieceLength);
    pipe.Offset = start % this.video.pieceLength;
    pipe.received = false;

    for (let IP in this.peers) {
        let peer = this.peers[IP];
        if (peer.choked === false && peer.bitField.get(pipe.Piece)) {
            pieceNotFound = false;
            let req = Buffer.alloc(12);
            req.writeInt32BE(pipe.Piece, 0);
            req.writeInt32BE(pipe.Offset, 4);
            req.writeInt32BE(pipe.Length, 8);
            peer.send(6, req);
            console.log(IP, "HAS", pipe.Piece, pipe.Offset, pipe.Length);
            //break;
        }
    }
    if (pieceNotFound) {
        console.log("PIECE:", pipe.Piece, "NOT FOUND <");
        if (!this._client) throw new Error("Torrent requires a client in order for peers to be added");
        return setTimeout(this._client.refreshPeers.bind(this._client, this.infoHashHex, function () {
            this._stream(IP);
        }.bind(this)), 2000);
    } /*else console.log("REQUESTED:", pipe.Piece, pipe.Offset);*/
}
//Torrent.prototype._pieceCB = function (piece, offset, data) {
//    if (this.res._closePipe) {
//        this.res.end();
//        this.res = null;
//        return delete this.res;
//    }
//    if (piece === this._req.Piece && offset === this._req.Offset && !this._req.received) {
//        this._req.received = true;
//        this.res.write(data.slice(0, 1 + this._streamEnd - this._req.start));
//        return data.length + this._req.start > this._streamEnd ?
//            this.res.end() : this._stream(this._req.start + data.length);
//    }
//};
Torrent.prototype.destroy = function () {
    if (this._destroyed) return;
    this._destroyed = true;
    this._client._torrentDestroyCB(this.infoHashHex);
    this._cutPipe = true;
    for (let IP in this.peers) this.peers[IP].destroy();
    this.peers = null;
    delete this.peers;
    this._client = null;
    delete this._client;
}
module.exports = Torrent;
"use strict";

const dgram = require('dgram');
const crypto = require("crypto");
const Torrent = require("./Torrent");

class Client /*extends require('stream').Writable*/ {
    constructor(opts, cb) {
        //super();
        this.trackers = [
            ["tracker.leechers-paradise.org", 6969],
            ["zer0day.ch", 1337],
            ["open.demonii.com", 1337],
            ["tracker.coppersurfer.tk", 6969],
            ["exodus.desync.com", 6969]
        ];
        this.tracker = this.trackers[0];
        this.torrents = {};
        this.sent = {};
        this.connectionID = Buffer.allocUnsafe(8).fill(0);
        this.connectionID.writeIntBE(4497486125440, 0, 8, true)
        if (!opts) opts = {};
        if (opts.trackers) {
            if (typeof opts.trackers === "string") this.trackers.push(opts.trackers);
            else if (typeof opts.trackers === "object") this.trackers.push(...opts.tracker);
        }
        if (opts.ID) {
            if ((typeof opts.ID === "string") && opts.ID.length === 20) this.ID = opts.ID;
            else return new Error("Invalid peer ID");
        }
        else this.ID = "-H31l0o-" + crypto.randomBytes(6).toString("hex");

        if (opts.port) {
            if (isNaN(opts.port)) return new Error("Invalid port");
            else this.port = opts.port;
        } else this.port = 56462;

        this.UDP = dgram.createSocket('udp4');
        this.UDP.on('error', err => {
            console.log(`UDP - Error`);
            this.UDP.close();
        });
        this.UDP.on('message', (msg, rinfo) => {
            console.log(`UDP - Received: ${rinfo.address}:${rinfo.port} ::`, msg);
            let tid = msg.slice(4, 8);
            if (tid in this.sent) {
                clearTimeout(this.sent[tid][1]);
                if (this.sent[tid][0]) this.sent[tid][0](msg);
                this.sent[tid] = null
                delete this.sent[tid];
            }
        });
        this.UDP.bind(this.port);
        this.send(Buffer.allocUnsafe(16).fill(0), function (x) {
            this.connectionID = x.slice(8, 16);
            this._ready = true;
            if (cb) cb(this);
        }.bind(this));
    }

    addTorrent(h, cb) {
        if (!this._ready) throw new Error("Client must finish starting before you can torrents.\nSet a callback: new Client([options],*cb*).\n\n");
        this.torrents[h] = new Torrent(h, null, this);
        this.refreshPeers(h, function (err, h) {
            if (err) {
                cb(err);
                return this.torrents[h].destroy();
            }
            this.torrents[h].on("ready", cb);
        }.bind(this));
        return this.torrents[h];
    }
    refreshPeers(h, cb) {
        let announce = Buffer.allocUnsafe(98);

        if (!(h in this.torrents)) return;
        announce.writeIntBE(1, 8, 4, true); // action
        announce.fill(h, 16, 36, "hex"); // info hash
        announce.fill(this.ID, 36, 56, "ascii"); // peer id
        announce.writeIntBE(0, 56, 8, true); // downloaded
        announce.writeIntBE(0, 64, 8, true); // left
        announce.writeIntBE(0, 72, 8, true); // uploaded
        announce.writeIntBE(0, 80, 4, true); // event
        announce.writeIntBE(0, 84, 4, true); // IP
        announce.writeIntBE(0, 88, 4, true); // key
        announce.writeIntBE(50, 92, 4, true); // num_want
        announce.writeUIntBE(0, 96, 2, true); // port

        this.send(announce, function (msg) {
            let peers = msg.slice(20);
            console.log(`\n ${peers.length / 6}  Peers Found\n`);
            if (peers.length === 0) {
                if (cb) cb(new Error("NO PEERS FOUND"), h);
                return;
            }
            for (let i = 0; i < peers.length; i += 6) this.torrents[h].addPeer(peers.slice(i, i + 6));
            if (cb) cb(null, h);
        }.bind(this));
        console.log("UDP - Fetching Peers ::", h);
    }

    send(buff, cb) {
        let tid = crypto.randomBytes(4),
            tids = tid.toString();
        this.sent[tids] = [cb, setTimeout(() => {
            delete this.sent[tids];
            console.log("Missed UDP Response");
        }, 10000)];

        this.connectionID.copy(buff);
        buff.fill(tid, 12, 16, true);

        this.UDP.send(buff, this.tracker[1], this.tracker[0]);

        console.log("UDP - Sent:", this.tracker[0] + ":" + this.tracker[1], "::", buff);
    }
    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this.emit("destroy", this);
        for (let i = this.torrents.length; i--;) {
            this.torrents[i].destroy();
            this.torrents[i] = null;
            delete this.torrents[i];
        }
        delete this.torrents;
        this.UDP.destroy();
        delete this.UDP;
        delete this.torrents;
    }
}
Client.prototype._torrentDestroyCB = function (h) {
    console.log('TORRENT DESTROYED:', h);
    this.torrents[h] = null;
    delete this.torrents[h];
}
module.exports = Client;
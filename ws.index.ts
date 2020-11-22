import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { Msg } from './messageModel';
import { allSockets, sessionToSockets } from './state';
import { formatBytes, getSize, readEnvVar } from './util';

const SOCKET_TIMEOUT = readEnvVar('SOCKET_TIMEOUT', 1000 * 60 * 5);
const SOCKET_TIMEOUT_CHECK_INTERVAL = readEnvVar('SOCKET_TIMEOUT_CHECK_INTERVAL', 1000 * 80);

const UNSUPPORTED_MSG = Symbol();

const createMsg = (data: Msg) => JSON.stringify(data);

function onPing(this: WebSocket) {
    let data = allSockets.get(this);
    data.lastPing = Date.now();
    allSockets.set(this, data);
}

function parseData(data: WebSocket.Data) {
    if (typeof data != 'string') {
        console.log('uknown data type');
        return UNSUPPORTED_MSG;
    }
    var msg = JSON.parse(data) as Msg;
    (msg as any).type = msg.type.toLowerCase();
    return msg;
}

function removeSocket(this: WebSocket) {
    let socket = this;
    let info = allSockets.get(socket);
    if (info && info.sessionId) {
        removeSocketFromSession(info.sessionId, socket);
    }
    else {
        allSockets.delete(socket);
    }
    console.log(`connection closed. session: ${info?.sessionId}`);
}

function removeSocketFromSession(sessionId: string, socket: WebSocket) {
    if (!sessionId) return;
    let arr = sessionToSockets.get(sessionId);
    if (!arr) return;
    arr = arr.filter(s => s != socket);
    if (!arr.length) {
        sessionToSockets.delete(sessionId);
    } else {
        sessionToSockets.set(sessionId, arr);
        notifyOnSessionUpdate(arr);
    }
}

function notifyOnSessionUpdate(clients: WebSocket[]) {
    let leaderConnected = clients.some(s => allSockets.get(s)?.isLeader ?? false);
    for (let s of clients) {
        s.send(createMsg({
            type: 'sessionstate',
            leaderConnected,
            playersCount: clients.length
        }));
    }
}

function addSocketToSession(sessionId: string, socket: WebSocket) {
    let arr = sessionToSockets.get(sessionId);
    if (!arr) {
        arr = [socket];
        sessionToSockets.set(sessionId, arr);
    } else {
        arr.push(socket);
    }
    notifyOnSessionUpdate(arr);
}

async function onMsg(this: WebSocket, data: WebSocket.Data) {
    let currentSocket = this;

    let dataSize = getSize(data);
    let socketInfo = allSockets.get(currentSocket);
    if (socketInfo) {
        socketInfo.bytesPushedTotal += dataSize;
        socketInfo.lastPing = Date.now();
    }

    if (data == 'ping') {
        return;
    }

    const msg = parseData(data);
    if (msg == UNSUPPORTED_MSG) {
        currentSocket.send(createMsg({
            type: 'servermsg',
            level: 'warn',
            text: `uknown message`
        }));
        return;
    }

    console.log(`received: ${msg.type} ${formatBytes(dataSize)} / ${formatBytes(socketInfo.bytesPushedTotal)} total`);

    switch (msg.type) {
        case 'push': {
            let socks = sessionToSockets.get(msg.sessionId);
            if (!socks) return;
            // send this package to all except self & leaders
            let promises = socks
                .filter(s => !allSockets.get(s).isLeader && s != currentSocket)
                .map(s => new Promise((rs, rj) => s.send(data, { compress: true }, err => err ? rj(err) : rs())));
            await Promise.all(promises);
            console.log(`Data pushed. Notified ${promises.length} clients`);
            break;
        }

        case 'setsession': {
            let info = allSockets.get(currentSocket);
            if (!msg.sessionId) {
                currentSocket.send(createMsg({
                    type: 'servermsg',
                    level: 'warn',
                    text: 'Session id cannot be empty!'
                }));
                return;
            }

            // check if sockets already attached to some session
            if (info) {
                if (info.sessionId == msg.sessionId) {
                    if (info.isLeader != msg.isLeader) {
                        // notify if became leader
                        info.isLeader = msg.isLeader;
                        let arr = sessionToSockets.get(msg.sessionId);
                        arr && notifyOnSessionUpdate(arr);
                    }
                    // skip if in same session
                    return;
                } else {
                    // remove from existing session
                    removeSocketFromSession(info.sessionId, currentSocket);
                }
            } else {
                info = {
                    sessionId: msg.sessionId,
                    lastPing: Date.now(),
                    isLeader: msg.isLeader,
                    bytesPushedTotal: getSize(data)
                };
                allSockets.set(currentSocket, info);
            }

            info.sessionId = msg.sessionId;
            info.isLeader = msg.isLeader;
            addSocketToSession(msg.sessionId, currentSocket);
            break;
        }

        case 'close': {
            let info = allSockets.get(currentSocket);
            allSockets.delete(currentSocket);
            if (info.sessionId) {
                removeSocketFromSession(info.sessionId, currentSocket);
            }
            break;
        }

        default:
            currentSocket.send(createMsg({
                type: 'servermsg',
                level: 'warn',
                text: `unexpected message type ${msg.type}!`
            }));
            break;
    }

    console.log(`Active sessions: ${sessionToSockets.size}, sockets: ${allSockets.size}`);

}

function checkTimeoutSockets() {
    let now = Date.now();
    let removed = 0;
    let sessionCount = sessionToSockets.size;

    for (let [socket, info] of allSockets) {
        let elapsed = now - info.lastPing;
        if (elapsed > SOCKET_TIMEOUT) {
            console.log(`socket timeout ${info.sessionId}: ${elapsed} ms`);
            removeSocketFromSession(info.sessionId, socket);
            // yes, it's ok to remove entries while iterating
            allSockets.delete(socket);
            socket.close();
            removed++;
        }
    }

    let sessionCount2 = sessionToSockets.size;
    console.log(`Check timeout finished. Removed connections: ${removed} (${allSockets.size} still active), closed sessions: ${sessionCount - sessionCount2} (${sessionCount2} still active)`);

    setTimeout(checkTimeoutSockets, SOCKET_TIMEOUT_CHECK_INTERVAL);
}

export function registerWebsockets(app: express.Application, server: http.Server, prefix: string) {
    const wss = new WebSocket.Server({ server, path: prefix + '/connect', perMessageDeflate: {
        threshold: 50,
        clientNoContextTakeover: true,
        serverNoContextTakeover: true
    }});
    wss.on('connection', ws => {
        allSockets.set(ws, { sessionId: null, isLeader: null, lastPing: Date.now(), bytesPushedTotal: 0 });

        ws.on('ping', onPing);
        ws.on('message', onMsg);
        ws.on('close', removeSocket);
    });

    app.get(prefix + '/version', (rq, rs) => {
        console.log("version check");
        return rs.status(200).send('0.1');
    });
    app.get(prefix + '/', (rq, rs) => {
        rs.status(200).send(`Sever is OK!
<br\>Active sessions: ${sessionToSockets.size}
<br\>Active sockets: ${allSockets.size}
<br\>Data pushed total: ${formatBytes([...allSockets.values()].reduce((acc, s) => acc + s.bytesPushedTotal, 0))}
<br\>Uptime: ${process.uptime().toFixed(2)} sec
`);
    });

    setTimeout(checkTimeoutSockets, SOCKET_TIMEOUT_CHECK_INTERVAL);
}

// TODO: uncomment this when become standard
// var cors = require('cors')
//
// const app = express();
// const server = http.createServer(app);
// register(app, server, '');
// app.use(express.json())
// app.use(cors());
// app.use(express.static('public'));
//
// setTimeout(checkTimeoutSockets, SOCKET_TIMEOUT_CHECK_INTERVAL);
// server.listen(process.env.PORT || 5001, () => console.log(`started ${server.address()['port']}!`));


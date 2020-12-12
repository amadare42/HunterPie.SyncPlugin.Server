import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { Msg } from '../messageModel';
import { allSockets, sessionToSockets } from '../state';
import { formatBytes, generateUid, getSize, readEnvVar } from '../util';
import { registerWs } from '../util/registerWs';
import { logger } from '../util/logging';
const url = require('url');

const SOCKET_TIMEOUT = readEnvVar('SOCKET_TIMEOUT', 1000 * 60 * 5);
const SOCKET_TIMEOUT_CHECK_INTERVAL = readEnvVar('SOCKET_TIMEOUT_CHECK_INTERVAL', 1000 * 80);

const UNSUPPORTED_MSG = Symbol();

const createMsg = (data: Msg) => JSON.stringify(data);

function onPing(this: WebSocket) {
    const now = Date.now();
    if (logger.isTraceEnabled()) {
        const info = allSockets.get(this);
        logger.trace(`${ info?.name } ping. (last ping ${ now - info?.lastPing })`);
    }
    let data = allSockets.get(this);
    data.lastPing = now;
    allSockets.set(this, data);
}

function parseData(data: WebSocket.Data) {
    if (typeof data != 'string') {
        logger.info('uknown data type');
        return UNSUPPORTED_MSG;
    }
    try {
        var msg = JSON.parse(data) as Msg;
        (msg as any).type = msg.type.toLowerCase();
        return msg;
    } catch (e){
        console.log(e);
        throw e;
    }
}

function onClose(this: WebSocket) {
    let socket = this;
    let info = allSockets.get(socket);
    if (info && info.sessionId) {
        removeSocketFromSession(info.sessionId, socket);
    }
    allSockets.delete(socket);
    logger.info(`connection closed. session: ${info && info.sessionId} (${ allSockets.size } total) [${info?.name}]`);
}

function removeSocketFromSession(sessionId: string, socket: WebSocket) {
    let info = allSockets.get(socket);
    logger.debug(`removeSocketFromSession sessionId: ${sessionId}, ${JSON.stringify(info, null, 2)}`);
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
    logger.debug(`notifyOnSessionUpdate ids: ${clients.map(c => allSockets.get(c)?.sessionId)}`);

    let leaderConnected = clients.some(s => {
        var info = allSockets.get(s);
        if (!info) return false;
        return info.isLeader;
    });
    for (let s of clients) {
        send(s, createMsg({
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

function send(ws: WebSocket, data: string) {
    ws.send(data);
    let info = allSockets.get(ws);
    if (logger.isDebugEnabled()) {
        logger.debug(`sent [${info.name} ${info.sessionId} ${info.isLeader ? 'L' : 'P'}]`, data);
    }
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
        currentSocket.send('pong');
        return;
    }

    const msg = parseData(data);
    if (msg == UNSUPPORTED_MSG) {
        send(currentSocket, createMsg({
            type: 'servermsg',
            level: 'warn',
            text: `uknown message`
        }));
        return;
    }

    logger.info(`received: ${msg.type} ${formatBytes(dataSize)} / ${socketInfo && formatBytes(socketInfo.bytesPushedTotal) || 0} total [${socketInfo.name}]`);

    switch (msg.type) {
        case 'push': {
            logger.info(msg.type, msg.sessionId, socketInfo.name);
            let socks = sessionToSockets.get(msg.sessionId);
            if (!socks) return;
            // send this package to all except self & leaders
            let promises = socks
                .filter(s => !allSockets.get(s).isLeader && s != currentSocket)
                .map(s => new Promise((rs, rj) => s.send(data, { compress: true }, err => err ? rj(err) : rs(null))));
            await Promise.all(promises);
            logger.trace(JSON.stringify(msg));
            logger.info(`Data pushed. Notified ${promises.length} clients`);
            break;
        }

        case 'setsession': {
            logger.info(data);

            let info = allSockets.get(currentSocket);
            if (!msg.sessionId) {
                send(currentSocket, createMsg({
                    type: 'servermsg',
                    level: 'warn',
                    text: 'Session id cannot be empty!'
                }));
                return;
            }

            if (info.sessionId != msg.sessionId) {
                logger.info(`removed from previos session (${info.sessionId} != ${msg.sessionId})`)
                // remove from existing session
                removeSocketFromSession(info.sessionId, currentSocket);
            }

            info.sessionId = msg.sessionId;
            info.isLeader = msg.isLeader;
            addSocketToSession(msg.sessionId, currentSocket);
            break;
        }

        case 'leavesession': {
            let info = allSockets.get(currentSocket);
            if (info.sessionId) {
                removeSocketFromSession(info.sessionId, currentSocket);
            }
            break;
        }

        case 'setname':
            if (socketInfo) {
                logger.info(`${ socketInfo.name } -> ${ msg.name }`);
                socketInfo.name = msg.name;
            }
            break;

        default:
            send(currentSocket, createMsg({
                type: 'servermsg',
                level: 'warn',
                text: `unexpected message type ${msg.type}!`
            }));
            break;
    }

    logger.info(`Active sessions: ${sessionToSockets.size}, sockets: ${allSockets.size}`);
}

function checkTimeoutSockets() {
    let now = Date.now();
    let removed = 0;
    let sessionCount = sessionToSockets.size;

    for (let [socket, info] of allSockets) {
        let elapsed = now - info.lastPing;
        if (elapsed > SOCKET_TIMEOUT) {
            logger.info(`socket timeout ${info.sessionId}: ${elapsed} ms`);
            removeSocketFromSession(info.sessionId, socket);
            // yes, it's ok to remove entries while iterating
            allSockets.delete(socket);
            socket.close();
            removed++;
        }
    }

    let sessionCount2 = sessionToSockets.size;
    if (removed > 0) {
        logger.info(`Check timeout finished. Removed connections: ${ removed } (${ allSockets.size } still active), closed sessions: ${ sessionCount - sessionCount2 } (${ sessionCount2 } still active)`);
    }

    setTimeout(checkTimeoutSockets, SOCKET_TIMEOUT_CHECK_INTERVAL);
}

export function registerWsSync(app: express.Application, server: http.Server, prefix: string) {
    const wss = new WebSocket.Server({ noServer: true,
        perMessageDeflate: {
            threshold: 50,
            clientNoContextTakeover: true,
            serverNoContextTakeover: true
        }});
    registerWs(server, wss, prefix + '/connect');
    wss.on('connection', async (ws, rq) => {
        var name = new URLSearchParams(url.parse(rq.url).search).get('playerName') || generateUid();
        var info = { sessionId: null, isLeader: null, lastPing: Date.now(), bytesPushedTotal: 0, name };
        allSockets.set(ws, info);
        logger.info(`socket connected [${info.name}] (${allSockets.size} sockets total)`);

        ws.on('ping', onPing);
        ws.on('message', onMsg);
        ws.on('close', onClose);
    });

    app.get(prefix + '/version', (rq, rs) => {
        logger.info("version check");
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
    return wss;
}

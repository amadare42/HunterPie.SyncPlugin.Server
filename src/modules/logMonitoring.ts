import * as express from 'express';
import * as http from "http";
import * as WebSocket from 'ws';
import { registerWs } from '../util/registerWs';
import { subscribeToLogs } from '../util/logging';
import * as url from 'url';

const sockets = new Set<WebSocket>();
const socketsToRooms = new Map<WebSocket, string>();
let logsCache = [];
let shippingScheduled = false;

export function registerLogger(app: express.Application, server: http.Server, prefix: string) {
    app.post(prefix + '/logs/add', (rq, rs) => {
        handleRq(rq.body);
        rs.status(200).send();
    });

    const wss = new WebSocket.Server({ noServer: true });
    registerWs(server, wss, prefix + '/logs/listen');

    wss.on("connection", (ws, rq) => {

        let room = url.parse(rq.url, true).query.room || '';
        sockets.add(ws);
        socketsToRooms.set(ws, room ? room + '' : '');
        ws.on("message", () => {
            return;
        });
    });
    wss.on("close", ws => {
        sockets.delete(ws);
        socketsToRooms.delete(ws);
    });

    subscribeToLogs(msg => {
        addLog({
            ...msg,
            user: 'server'
        });
    });
}

function handleRq(data: any | any[]) {
    let time = Date.now();
    if (data instanceof Array) {
        for (let log of data) {
            log.serverTime = time;
            addLog(log);
        }
    } else {
        data.serverTime = time;
        addLog(data);
    }
}

function addLog(log) {
    log.seqNumber = Number(process.hrtime.bigint());
    log.room = log.room ? log.room : '';
    logsCache.push(log);
    if (shippingScheduled) return;
    setTimeout(shipLogs, 100);
    shippingScheduled = true;
}


function shipLogs() {
    if (logsCache.length) {
        let rooms = {};

        // group logs by room
        for (let log of logsCache) {
            let key = log.room || '';
            (rooms[key] || (rooms[key] = [])).push(log);
        }

        // stringify all messages in rooms
        for (let key of Object.keys(rooms)) {
            const data = rooms[key];

            rooms[key] = JSON.stringify(data);
        }

        // send room data to all sockets
        for (let ws of sockets) {
            let room = socketsToRooms.get(ws) || null;

            if (!room) {
                // if room id is empty, send data from every room
                for (let key of Object.keys(rooms)) {
                    let data = rooms[key];
                    if (data) {
                        ws.send(data);
                    }
                }
            } else {
                // if room specified, send data only from specified room
                let data = rooms[room];
                if (data) {
                    ws.send(data);
                }

                // send non-roomed messages
                let nonRoomed = rooms[''];
                if (nonRoomed) {
                    ws.send(nonRoomed);
                }
            }
        }

        // clean cache
        logsCache = [];
    }
    shippingScheduled = false;
}

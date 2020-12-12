import * as http from "http";
import * as WebSocket from 'ws';
const url = require('url');

export function registerWs(server: http.Server, wss: WebSocket.Server, path: string) {
    server.on("upgrade", (rq, socket, head) => {
        if (url.parse(rq.url).pathname == path) {
            wss.handleUpgrade(rq, socket, head, ws => wss.emit('connection', ws, rq))
        }
    });
}

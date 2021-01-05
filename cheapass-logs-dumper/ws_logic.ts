import * as WebSocket from 'ws';

const wsEndpoint = process.env.WS_ENDPOINT;
let ws: WebSocket;
let onMsg: (msg: any[]) => void;

setInterval(() => {
    if (ws && ws.readyState == 1) {
        ws.ping()
    }
}, 3000);

async function connect() {
    ws = new WebSocket(wsEndpoint);
    console.log('connecting...');
    
    await new Promise<void>(r => {
        ws.on("open", () => {
            console.log('connected');
            r();
        });
    });

    ws.on("close", () => {
        console.log("connection closed");
        setImmediate(connect);
    });
    ws.on("message", msg => {
        onMsg(JSON.parse(msg as string))
    });
}

export function startWs(onMsgHandler: (msg: any[]) => void) {
    onMsg = onMsgHandler;
    connect();
}

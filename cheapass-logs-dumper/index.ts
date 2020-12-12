import * as WebSocket from 'ws';
import * as sql from 'mssql';

require('dotenv').config();
if (!process.env.WS_ENDPOINT || !process.env.SQL_CONNECTION_STRING) {
    throw "Specify WS_ENDPOINT and SQL_CONNECTION_STRING values in .env!";
}

/*
Since I didn't found free sql db service, I'll use this script to receive all logs from server and dump them to local db.
 */

const wsEndpoint = process.env.WS_ENDPOINT;
const sqlPool = new sql.ConnectionPool(process.env.SQL_CONNECTION_STRING);


async function run() {
    await sqlPool.connect();
    console.log('connected to DB!');
    const rq = new sql.Request(sqlPool);

    let ws = new WebSocket(wsEndpoint);
    ws.on('open', () => console.log('connected!'));
    ws.on('close', () => {
        console.log('connection closed. Reconnecting...');
        function reconnect() {
            console.log('connection closed. Reconnecting...');
            ws = new WebSocket(wsEndpoint);
            ws.on('open', () => console.log('reconnected!'));
            ws.on('message', onMessage(rq));
            ws.on('close', () => setTimeout(reconnect, 2000))
        }
        setTimeout(reconnect, 2000);
    })

    ws.on('message', onMessage(rq));
}

const onMessage = (rq: sql.Request) => async (wsData: any) => {
    const msg = parseData(wsData);
    let query = msg instanceof Array
        ? msg.map(generateInsertQuery).join(' ')
        : generateInsertQuery(msg);
    return rq.query(query);
}

function generateInsertQuery(entry) {
    return `INSERT INTO LogEntry (client_time, level, msg, [user], room, server_time, seq_number, text) VALUES(
    ${sqlTime(entry.timestamp)}
    ,'${entry.level}'
    ,'${entry.msg}'
    ,'${entry.user}'
    ,${!entry.room || entry.room == 'undefined' ? 'NULL' : `'${entry.room}'` }
    ,${sqlTime(entry.serverTime)}
    ,${entry.seqNumber}
    ,'${formatMsg(entry)}');`;
}


function formatMsg(msg) {
    return `${formatDate(msg.timestamp)} [${msg.level}] ${msg.msg}`;
}

function formatDate(timestamp) {
    const date = new Date(parseInt(timestamp));
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds() % 1000).padEnd(3, '0');
    return `${hours}:${minutes}:${seconds}:${ms} `;
}

function sqlTime(timestamp) {
    if (!timestamp) return 'NULL';
    const dateObject = new Date(parseInt(timestamp));
    try {
        return `CAST(N'${ dateObject.toISOString() }' AS DateTime)`;
    } catch (e) {
        console.log(timestamp, dateObject);
        throw e;
    }
}

function parseData(data: WebSocket.Data) {
    if (typeof data != 'string') {
        throw 'unknown data type';
    }
    try {
        return JSON.parse(data)
    } catch (e){
        console.log(e);
        throw e;
    }
}

run();

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

    let ws = new WebSocket(wsEndpoint);
    ws.on('open', () => console.log('connected!'));
    setInterval(() => {
        ws.ping()
    }, 3000);
    ws.on('close', () => {
        console.log('connection closed. Reconnecting...');
        function reconnect() {
            console.log('connection closed. Reconnecting...');
            ws = new WebSocket(wsEndpoint);
            ws.on('open', () => console.log('reconnected!'));
            ws.on('message', onMessage(sqlPool));
            ws.on('close', () => setTimeout(reconnect, 2000))
        }
        setTimeout(reconnect, 2000);
    });

    ws.on('message', onMessage(sqlPool));
}

const onMessage = (pool: sql.ConnectionPool) => async (wsData: any) => {
    const msg = parseData(wsData);
    await (msg instanceof Array
        ? Promise.all(msg.map(e => executeInsert(e, pool)))
        : executeInsert(msg, pool));
}

async function executeInsert(entry: any, pool: sql.ConnectionPool) {
    let ps = new sql.PreparedStatement(pool);

    ps.input('timestamp', sql.DateTime);
    ps.input('level', sql.VarChar);
    ps.input('msg', sql.VarChar);
    ps.input('user', sql.VarChar);
    ps.input('room', sql.VarChar);
    ps.input('serverTime', sql.DateTime);
    ps.input('seqNumber', sql.BigInt);
    ps.input('text', sql.VarChar);
    let values = {
        ...entry,
        room: !entry.room || entry.room == 'undefined' ? null : entry.room,
        text: formatMsg(entry),
        timestamp: entry.timestamp ? new Date(parseInt(entry.timestamp)) : null,
        serverTime: new Date(entry.serverTime)
    };

    await ps.prepare(`INSERT INTO LogEntry (client_time, level, msg, [user], room, server_time, seq_number, text) 
    VALUES(@timestamp, @level, @msg, @user, @room, @serverTime, @seqNumber, @text)`);
    await ps.execute(values);
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

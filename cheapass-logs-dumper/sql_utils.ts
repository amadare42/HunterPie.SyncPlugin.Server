import * as mysql from 'mysql2/promise';

let entriesQueue = [];

let connection: mysql.Connection = null;

async function createConnection() {
    const connection = await mysql.createConnection(process.env.SQL_CONNECTION_STRING);
    await connection.connect();
    console.log('connected to db');
    return connection;
}

async function drainQueue() {
    try {
        connection = connection || await createConnection();
        const copy = [...entriesQueue];
        entriesQueue = [];

        for (let entry of copy) {
            const { cols, vals, templates } = toInsert(entry, [
                { col: 'client_time', key: 'timestamp', prepare: toIsoDate }, 
                'level', 
                'msg', 
                { col: 'user', key: 'user', prepare: normalizeNull },
                { col: 'room', key: 'room', prepare: normalizeNull }, 
                { col: 'server_time', key: 'serverTime', prepare: toIsoDate }, 
                { col: 'seq_number', key: 'seqNumber', prepare: identity },
                'text'
            ]);
            await connection.execute(`insert into LogEntry (${cols.join()}) values (${templates.join()})`, vals);
        }
        if (copy.length) {
            console.log(`Dumped ${copy.length} entries`);
        }
    } finally {
        setTimeout(drainQueue, 1000);
    }
}

const normalizeNull = (v) => ({ val: v ? v : null, template: '?' });

const identity = (v) => ({ val: v, template: '?' });

function toInsert(obj, columns) {
    let cols = [];
    let vals = [];
    let templates = [];
    for (let col of columns) {
        const { col: name, prepare, key } = typeof col == 'string'
            ? { col, prepare: identity, key: col }
            : col;
        cols.push(name);
        const { val, template } = prepare(obj[key]);
        vals.push(val);
        templates.push(template || '?');
    }

    return { cols, vals, templates };
}

function toIsoDate(timestamp) {
    return {
        val: (parseInt(timestamp) / 1000).toFixed(3),
        template: 'from_unixtime(?)'
    }
}

export function start() {
    drainQueue();
}

export function addEntry(...entry: any[]) {
    entriesQueue.push(...entry);
}

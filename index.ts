import * as express from 'express';
import * as http from "http";
import { registerWebsockets } from './ws.index';
const fs = require('fs');
var cors = require('cors')

interface Monster {
}

type Model = {
    Monsters: Monster[],
    lastUpdate: number
};

type Poll = {
    startedAt: number,
    cb: (model: Monster[]) => void,
    pollId: string
}

const delays = {
    pollTimeout: 1000 * 25 /* 25 sec */,
    pollCheckInterval: 1000 * 4 /* 4 sec */,
    sessionTimeout: 1000 * 60 * 5 /* 5 mins */,
    sessionCheckInterval: 1000 * 60 /* 1 min */
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function clearOldSessions() {
    // removes all sessions that doesn't have updates for 5+ minutes
    let now = Date.now();
    let deletedSessions = 0;

    console.log('cleaning old sessions');
    for (let [sessionId, model] of games.entries()) {
        if (now - model.lastUpdate > delays.sessionTimeout) {
            games.delete(sessionId);
            let polls = sessionsToPolls.get(sessionId);
            polls && polls.forEach(p => pollInited.delete(p.pollId));
            sessionsToPolls.delete(sessionId);
            deletedSessions++;
        }
    }
    console.log(`cleared ${deletedSessions} sessions (${games.size} still active).`);
    setTimeout(clearOldSessions, delays.sessionCheckInterval);
}

function timeoutPolls() {
    let now = Date.now();
    for (let [sessionId, polls] of sessionsToPolls) {
        if (polls) {
            let timedoutPolls = polls.filter(poll => now - poll.startedAt > delays.pollTimeout);
            polls = polls.filter(p => !timedoutPolls.includes(p));
            timedoutPolls.map(p => setTimeout(() => p.cb(null), 0));
        }
    }
    setTimeout(timeoutPolls, delays.pollCheckInterval);
}

function getActivePollsCount() {
    let count = 0;
    for (let [_, polls] of sessionsToPolls) {
        count += polls.length;
    }
    return count;
}

// session id - game
var games = new Map<string, Model>();

// session id - polls
var sessionsToPolls = new Map<string, Poll[]>();

// poll ids with initial data
var pollInited = new Set<string>();

const app = express();
const server = http.createServer(app);
app.use(express.json())
app.use(cors());
app.use(express.static('public'));

let totalPush = 0;

// GET PollMonsterChanges(sessionId, pollId) -> Monster[]
app.get('/game/:sessionId/poll/:pollId', (rq, rs) => {
    const sessionId = rq.params['sessionId'];
    const pollId = rq.params['pollId'];
    console.log(`poll changes ${sessionId} ${pollId}`);

    if (!pollInited.has(pollId)) {
        let session = games.get(sessionId);
        rs.status(200).json((session && session.Monsters) || []);
        pollInited.add(pollId);
        return;
    }

    var polls = sessionsToPolls.get(sessionId);
    if (!polls) {
        polls = [];
        sessionsToPolls.set(sessionId, polls);
    }

    let poll: Poll = {
        pollId,
        startedAt: Date.now(),
        cb: model => {
            polls = sessionsToPolls.get(sessionId);
            sessionsToPolls.set(sessionId, polls.filter(p => p != poll));
            rs.status(200).json(model);
        }
    };

    polls.push(poll);
});

// GET PullGame(sessionId) -> Monster[]
app.get('/game/:sessionId', (rq, rs) => {
    const id = rq.params['sessionId'];
    console.log(`pull game ${id}`)
    const model = games.get(id);
    rs.status(200).json((model && model.Monsters) || null);
});

// PUT PushChangedMonsters(sessionId, Monster[]) -> ""
app.put('/game/:sessionId', (rq, rs) => {
    const sessionId = rq.params['sessionId'];
    totalPush += parseInt(rq.header("content-length"));
    console.log(`push changes ${sessionId} (total: ${formatBytes(totalPush)})`);
    const monsters = rq.body as Monster[];

    let model = games.get(sessionId);
    if (!model) {
        model = {
            Monsters: monsters,
            lastUpdate: Date.now()
        }
        games.set(sessionId, model);
    }

    // respond to polls before responding to this request to avoid overwhelming server
    const polls = sessionsToPolls.get(sessionId);
    if (polls) {
        for (let poll of polls) {
            try {
                poll.cb(monsters);
            } catch (e) {
                console.error(`Error on responding to poll for session ${sessionId}`)
            }
        }
        sessionsToPolls.set(sessionId, []);
    }
    rs.status(200).json();
});


app.get('/', (rq, rs) => {
    rs.status(200).send(`Sever is OK!
<br\>Active sessions: ${games.size}
<br\>Active polls: ${getActivePollsCount()}
<br\>Data pushed total: ${formatBytes(totalPush)}
<br\>Uptime: ${process.uptime().toFixed(2)} sec
`);
});

// debugging
// app.post('/save', (rq, rs) => {
//     fs.writeFileSync('state.json', JSON.stringify([...games], null, 2));
//     rs.status(200).json('ok');
// });
//
// app.post('/load', (rq, rs) => {
//     games = new Map(JSON.parse(fs.readFileSync('state.json').toString()));
//     console.log('read from state.json');
//     rs.status(200).json('ok');
// });

setTimeout(clearOldSessions, delays.sessionCheckInterval);
setTimeout(timeoutPolls, delays.pollCheckInterval);
registerWebsockets(app, server, '/dev');
server.listen(process.env.PORT || 5001, () => console.log('started!'));

import * as express from 'express';
import * as http from "http";
import { registerWsSync } from './modules/websocketSync';
import { registerLogger } from './modules/logMonitoring';
import { shimConsole } from './util/logging';
import { registerPolling } from './modules/legacyPolling';
import { registerPublicDir } from './modules/publicDir';
var cors = require('cors')
shimConsole(console, '[console]');

const app = express();
const server = http.createServer(app);
app.use(express.json())
app.use(cors());

registerPublicDir(app);
// registerPolling(app, server, '/poll')
registerWsSync(app, server, '');
registerLogger(app, server, '');

server.listen(process.env.PORT || 5001, () => console.log('started!'));

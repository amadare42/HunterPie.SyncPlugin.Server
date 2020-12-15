/*
Since I didn't found free sql db service, I'll use this script to receive all logs from server and dump them to local db.
 */


require('dotenv').config();
if (!process.env.WS_ENDPOINT || !process.env.SQL_CONNECTION_STRING) {
    throw "Specify WS_ENDPOINT and SQL_CONNECTION_STRING values in .env!";
}

import { addEntry, start as startSqlLoop } from "./sql_utils";
import { startWs } from "./ws_logic";

startSqlLoop();
startWs(msg => {
    if (msg instanceof Array) {
        addEntry(...msg);
    } else {
        addEntry(msg);
    }
});

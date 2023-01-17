# Sync Plugin server
---

Implementation for HunterPie's [SyncPlugin](https://github.com/amadare42/HunterPie.SyncPlugin).
Currently deployed on: https://amadare-mhw-sync.herokuapp.com/

## Websockets API

For websockets there is simple flow that needs to be done. Note that `type` member isn't case-sensitive. Currently, it is available on https://amadare-mhw-sync.herokuapp.com/ root.

Here is list of all possible messages in vague order:

1. Check version with HTTP GET `/version`. It will return valid numberic version.
2. Connect to websockets endpoint `/connect`. Client is expected to make ping requests (e.g. send Ping frame with 0x9 opcode https://tools.ietf.org/html/rfc6455#section-5.5.2), otherwise connection will be closed after 5 minutes of inactivity. Data frame containing literal word "ping" will work as well.
3. Every member should then send SetSession message to bind this connection to specific session:
```json
{
  "type": "SetSession",
  "sessionId": "<your session id>",
  "isLeader" true | false
}
``` 
4. On every session members update, `SessionState` message will be sent to all members:
```json
{
    "type": "SessionState",
    "playersCount": <players count>,
    "leaderConnected": true | false
}
```
5. Leader can then send Push messages that will be propagated to all other non-leader members:
```json
{
  "type": "Push",
  "sessionId": "<your session id>",
  "data": <monster data>
}
```
> NOTE: specific model for monster data aren't defined for server.

6. Non-leader members will receive same exact message described in `5.`
7. Any member can receive `ServerMessage` message that is expected to be displayed on client. This can be used to notify about some errors or maintenance warnings.
```json
{
    "type": "ServerMessage",
    "text": "<Server message text>",
    "level": "trace" | "debug" | "info" | "warn" | "error"
}    
```
7. To unbind connection from session, `Close` message can be sent by any member:
```json
{
  "type": "Close"
}
```

### Message compression
It is expected for clients to use `deflate-message` compression algorithm, but without context takeover since at the time of writing, client doesn't support it.

## Logging
Under `/logs.html` endpoint tool to monitor logs is available. It will display server logs at realtime.
It will also display logs that are sent to `/logs/add` endpoint. Expected format:
```js
{
    timestamp: number, // unix timestamp in milliseconds
    level: string, // log level: debug, trace, info, warn, error
    msg: string, // message text
    text: string, // redundant full entry representation (with time and level)
    user: string, // user name
    room: string
}
```
Array of objects of this type is also supported.

These logs will be sent to `/logs/listen?roomId=<roomId>` endpoint. They are not stored anywhere. So for further analysis it will be useful to dump them into DB. `cheapass-logs-dumper` will do exactly that: connects to specified server and listen for all received logs to DB.

## Hosting with Docker
If you want to host this yourself, simply use the docker-compose supplied in the project root.
Please note that you may need to configure your webserver to pass the websocket. Here is a simple example for Nginx:

```nginx
server_tokens off;

server {
    listen 80;
    server_name hunterpie-sync.domain.com;

    access_log /var/log/nginx/hunterpie-sync.domain.com.log;
    error_log  /var/log/nginx/hunterpie-sync.domain.com.log error;

    sendfile off;
    add_header X-Robots-Tag none;

    location / {
                    proxy_pass http://127.0.0.1:5001;
    }
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

upstream hunterpie-sync {
    # enable sticky session based on IP
    ip_hash;

    server localhost:5001;
  }
```
# Sync Plugin server
---

Implementation for HunterPie's [SyncPlugin](https://github.com/amadare42/HunterPie.SyncPlugin).
Currently deployed on: https://amadare-mhw-sync.herokuapp.com/

## REST API

Implements extremely simple protocol.

`PUT /game/{sessionId}`
 
 Lead player can push monster information to this endpoint. Expects array of monsters as body. Session will be timed out after 5 minutes without new updates.

`GET /game/{sessionId}/poll/{pollId}`

Peer players can poll monster information from this endpoint. For first call (new pollId), it will return available monster data right away. For each subsequent call it will either return monster data that is pushed by lead player or null if no updates were available before timeout.

`GET /game/{sessionId}`

Return all monsters in session.

## Websockets API

For websockets there is simple flow that needs to be done. Note that `type` member isn't case-sensitive. Currently, it is available on https://amadare-mhw-sync.herokuapp.com/dev root.

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

## Message compression
It is expected for clients to use `deflate-message` compression algorithm, but without context takeover since at the time of writing, client doesn't support it.

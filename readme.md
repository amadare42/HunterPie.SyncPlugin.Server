# Sync Plugin server
---

Implementation for HunterPie's [SyncPlugin](https://github.com/amadare42/HunterPie.SyncPlugin).
Currently deployed on: https://amadare-mhw-sync.herokuapp.com/

## API

Implements extremely simple protocol.

`PUT /game/{sessionId}`
 
 Lead player can push monster information to this endpoint. Expects array of monsters as body. Session will be timed out after 5 minutes without new updates.

`GET /game/{sessionId}/poll/{pollId}`

Peer players can poll monster information from this endpoint. For first call (new pollId), it will return available monster data right away. For each subsequent call it will either return monster data that is pushed by lead player or null if no updates were available before timeout.

`GET /game/{sessionId}`

Return all monsters in session.

## Model
Currently, server doesn't depend on monster model. As long as it is consistent, it can be anything.

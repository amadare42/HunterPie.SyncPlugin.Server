export type PushMsg = {
    type: 'push',
    sessionId: string,
    data: any
}

export type SetSessionMsg = {
    type: 'setsession',
    sessionId: string,
    isLeader: boolean
}

export type CloseMsg = {
    type: 'close'
}

export type ServerMsg = {
    type: 'servermsg',
    text: string,
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error'
}

export type SessionStateMsg = {
    type: 'sessionstate',
    playersCount: number,
    leaderConnected: boolean
}

export type Msg = PushMsg | SetSessionMsg | CloseMsg | ServerMsg | SessionStateMsg;


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

export type LeaveMsg = {
    type: 'leavesession'
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

export type SetNameMessage = {
    type: 'setname',
    name: string
}

export type Msg = PushMsg | SetSessionMsg | LeaveMsg | ServerMsg | SessionStateMsg | SetNameMessage;


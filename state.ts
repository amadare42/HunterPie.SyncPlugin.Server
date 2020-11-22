import * as WebSocket from 'ws';

export type SocketInfo = {
    sessionId: string,
    isLeader: boolean | null,
    lastPing: number,
    bytesPushedTotal: number
}

export const sessionToSockets = new Map<string, WebSocket[]>();
export const allSockets = new Map<WebSocket, SocketInfo>();

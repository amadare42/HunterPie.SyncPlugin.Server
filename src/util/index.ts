import * as WebSocket from 'ws';

export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function readEnvVar<T>(name: string, defValue: T): T {
    let envVar = process.env[name];
    if (envVar == undefined) return defValue;
    if (typeof defValue == 'number') {
        return parseInt(envVar) as any;
    }
    return envVar as any;
}

export function getSize(data: WebSocket.Data) {
    if (typeof data == 'string') {
        return Buffer.byteLength(data);
    } else if (data instanceof Array) {
        return data.reduce((acc, v) => acc + v.byteLength, 0);
    } else {
        return data.byteLength;
    }
}

export function generateUid() {
    return ((Math.random() * 46656) | 0).toString(36) + '.' + ((Math.random() * 46656) | 0).toString(36);
}

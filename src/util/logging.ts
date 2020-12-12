import { configure, getLogger, LoggingEvent } from 'log4js';

export interface MsgModel {
    timestamp: number,
    level: string,
    msg: string,
    text: string
}

let logCb: (msg: MsgModel) => void = undefined

export function subscribeToLogs(cb: (msg: MsgModel) => void) {
    logCb = cb;
}

function fireEventAppender(layout, timezoneOffset) {
    // This is the appender function itself
    return (loggingEvent: LoggingEvent) => {
        if (logCb) {
            logCb({
                timestamp: loggingEvent.startTime.getTime(),
                msg: loggingEvent.data.join(' '),
                level: loggingEvent.level.levelStr,
                text: `${layout(loggingEvent, timezoneOffset)}`,
            });
        }
    };
}
function configureFireEvent(config, layouts) {
    // the default layout for the appender
    let layout = layouts.basicLayout;
    // check if there is another layout specified
    if (config.layout) {
        // load the layout
        layout = layouts.layout(config.layout.type, config.layout);
    }
    //create a new appender instance
    return fireEventAppender(layout, config.timezoneOffset);
}

function formatTime(date: Date) {
    var hours = String(date.getHours()).padStart(2, '0')
    var minutes = String(date.getMinutes()).padStart(2, '0');
    var seconds = String(date.getSeconds()).padStart(2, '0');
    let ms = String(date.getMilliseconds() % 1000).padEnd(3, '0');
    return `${hours}:${minutes}:${seconds}:${ms}`;

}

function createLogger(logLevel: string) {
    const logger = getLogger();
    configure({
        appenders: {
            ws: { type: { configure: configureFireEvent },
                layout: {
                    type: "pattern",
                    pattern: "%x{ln} [%p] %m",
                    tokens: {
                        ln: function (data) {
                            const date = data.startTime;
                            return formatTime(date);
                        }
                    }
                }
                },
            console: { type: "console",
                layout: {
                    type: "pattern",
                    pattern: "%x{dt} %[[%p]%] %m",
                    tokens: {
                        dt: function (data) {
                            const date = data.startTime;
                            return formatTime(date);
                        }
                    }
                } }
        },
        categories: {
            default: { appenders: ["ws", "console"], level: "trace" }
        }
    });
    // logger.level = logLevel;
    return logger;
}

export const logger = createLogger('trace');

export function shimConsole(console: Console, tag: string) {
    console.log = (...args: any[]) => (logger.info as any)(tag, ...args);
    console.error = (...args: any[]) => (logger.error as any)(tag, ...args);
    console.warn = (...args: any[]) => (logger.warn as any)(tag, ...args);
}

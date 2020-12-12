import * as express from 'express';
import { logger } from '../util/logging';

export function registerPublicDir(app: express.Application) {
    app.use(function (req, res, next) {
        if (req.url.includes('update')) {
            logger.trace('RQ ' + req.url + ' ' + req.ip);
        }
        next();
    })
    app.use(express.static('public'));
}

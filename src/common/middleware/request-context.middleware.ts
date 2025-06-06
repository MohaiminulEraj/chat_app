import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // Add request ID for tracking
        req['requestId'] = req.headers['x-request-id'] || uuidv4()
        res.setHeader('X-Request-ID', req['requestId'])

        // Add request timestamp
        req['requestTime'] = new Date()

        next()
    }
}

import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor
} from '@nestjs/common'
import * as chalk from 'chalk'
import { Observable } from 'rxjs'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('Request')

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest()
        const { method, url, user } = request
        const userId = user?.uuid || user?.sub || 'anonymous'
        const userName = user?.userName || user?.email || 'unknown'

        // Log authenticated user info
        if (user) {
            this.logger.verbose(
                chalk.blue(`🔐 Authenticated Request:`) +
                    chalk.gray(` ${method} ${url}`) +
                    chalk.green(` - User: ${userName} (${userId})`)
            )
        }

        return next.handle()
    }
}

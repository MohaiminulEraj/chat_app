import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor
} from '@nestjs/common'
import * as chalk from 'chalk'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
    private readonly logger = new Logger('Performance')

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest()
        const { method, url } = request
        const requestId = request['requestId']
        const start = Date.now()

        return next.handle().pipe(
            tap(() => {
                const responseTime = Date.now() - start

                if (responseTime > 500) {
                    // 500ms threshold for detailed logging
                    this.logger.warn(
                        chalk.yellow(`⚡ Performance Warning:`) +
                            chalk.yellow(` ${method} ${url}`) +
                            chalk.red(` took ${responseTime}ms`) +
                            chalk.gray(` [${requestId}]`)
                    )
                }
            })
        )
    }
}

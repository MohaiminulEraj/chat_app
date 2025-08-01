import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP')

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest()
        const response = context.switchToHttp().getResponse()
        const startTime = Date.now()

        const { method, url, ip, headers } = request
        const userAgent = headers['user-agent'] || '-'
        const clientIp = headers['x-forwarded-for'] || ip

        // Log if authorization header is present
        const hasAuth = !!headers.authorization

        this.logger.log(
            `➡️  ${method} ${url} - ${clientIp}${hasAuth ? ' [AUTH]' : ''}`
        )

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const duration = Date.now() - startTime
                    const statusCode = response.statusCode
                    const contentLength = response.get('content-length') || 0
                    const user = request.user

                    const userId = user?.email || user?.uuid || 'anonymous'

                    // Add auth header info to log
                    const authInfo = hasAuth ? ' (Auth Header Present)' : ''

                    this.logger.log(
                        `⬅️  ${method} ${url} ${statusCode} ${duration}ms ${contentLength} bytes User: ${userId} ${clientIp}${authInfo}`
                    )
                },
                error: (error) => {
                    const duration = Date.now() - startTime
                    const statusCode = error.status || 500
                    const user = request.user
                    const userId = user?.email || user?.uuid || 'anonymous'

                    this.logger.log(
                        `⬅️  ${method} ${url} ${statusCode} ${duration}ms ${0} bytes User: ${userId} ${clientIp}`
                    )

                    this.logger.error(`❌ ERROR RESPONSE`)
                    this.logger.error(`  Status: ${statusCode}`)
                    this.logger.error(`  Method: ${method}`)
                    this.logger.error(`  URL: ${url}`)
                    this.logger.error(`  User: ${userId}`)
                    this.logger.error(`  Response Time: ${duration}ms`)
                    if (hasAuth) {
                        this.logger.error(`  Auth Header: Present`)
                    }
                }
            })
        )
    }
}

import {
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Observable } from 'rxjs'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger('JwtAuthGuard')

    canActivate(
        context: ExecutionContext
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest()
        const authHeader = request.headers.authorization

        this.logger.log(`🔐 [AUTH_GUARD] Checking authentication`)
        this.logger.log(`   ├─ URL: ${request.url}`)
        this.logger.log(`   ├─ Method: ${request.method}`)
        this.logger.log(`   ├─ Auth Header Present: ${!!authHeader}`)

        if (authHeader) {
            this.logger.log(`   ├─ Auth Header Length: ${authHeader.length}`)
            this.logger.log(
                `   ├─ Auth Header Preview: ${authHeader.substring(0, 30)}...`
            )
            this.logger.log(
                `   └─ Has Bearer Prefix: ${authHeader.startsWith('Bearer ')}`
            )
        } else {
            this.logger.warn(`   └─ ⚠️  No Authorization header found`)

            // Log all headers for debugging
            this.logger.warn(
                `   └─ All headers: ${JSON.stringify(request.headers, null, 2)}`
            )
        }

        return super.canActivate(context)
    }

    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        const request = context.switchToHttp().getRequest()

        if (err || !user) {
            this.logger.error(`❌ [AUTH_GUARD] Authentication failed`)
            this.logger.error(`   ├─ URL: ${request.url}`)
            this.logger.error(`   ├─ Error: ${err?.message || 'No error'}`)
            this.logger.error(
                `   ├─ Info: ${info?.message || info || 'No info'}`
            )
            this.logger.error(`   └─ User: ${user ? 'Present' : 'Not found'}`)

            throw (
                err ||
                new UnauthorizedException(info?.message || 'Unauthorized')
            )
        }

        this.logger.log(`✅ [AUTH_GUARD] Authentication successful`)
        this.logger.log(`   ├─ User ID: ${user.uuid || user.id}`)
        this.logger.log(`   └─ User Email: ${user.email}`)

        return user
    }
}

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserTypes } from '../../modules/user/data/user-type.enum'

@Injectable()
export class AdminGuard implements CanActivate {
    private readonly logger = new Logger(AdminGuard.name)

    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserTypes[]>(
            'roles',
            [context.getHandler(), context.getClass()]
        )

        // If no roles are required, allow access
        if (!requiredRoles) {
            return true
        }

        const request = context.switchToHttp().getRequest()
        const user = request.user

        this.logger.log(
            `🔐 [ADMIN_GUARD] Checking authorization for user: ${user?.email}`
        )
        this.logger.log(
            `   ├─ User Type: ${user?.userType || 'undefined'}`
        )
        this.logger.log(
            `   └─ Required Roles: ${requiredRoles.join(', ')}`
        )

        if (!user) {
            this.logger.error('❌ [ADMIN_GUARD] User not authenticated')
            throw new ForbiddenException('User not authenticated')
        }

        // Check if user has the required role
        const hasRole = requiredRoles.includes(user.userType)

        if (!hasRole) {
            this.logger.error(
                `❌ [ADMIN_GUARD] Access denied for user: ${user.email} (${user.userType})`
            )
            throw new ForbiddenException(
                `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${user.userType}`
            )
        }

        this.logger.log(
            `✅ [ADMIN_GUARD] Authorization successful for user: ${user.email}`
        )
        return true
    }
}

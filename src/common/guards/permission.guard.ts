import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // get the required permissions from the route's metadata
        const allowedUserTypes = this.reflector.get<string[]>(
            'allowedUserTypes',
            context.getHandler()
        )

        const request = context.switchToHttp().getRequest()

        // Allow superadmin to access everything
        if (request.user.userType === 'superadmin') {
            return true
        }

        // Check if user type is allowed for this route
        if (allowedUserTypes && allowedUserTypes.length) {
            return allowedUserTypes.includes(request.user.userType)
        }

        // Default deny access if no specific user types are allowed
        return false
    }
}

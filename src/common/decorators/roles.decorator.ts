import { SetMetadata } from '@nestjs/common'
import { UserTypes } from '../../modules/user/data/user-type.enum'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: UserTypes[]) => SetMetadata(ROLES_KEY, roles)

// Convenience decorators for common role combinations
export const AdminOnly = () => SetMetadata(ROLES_KEY, [UserTypes.ADMIN])
export const ModeratorOnly = () => SetMetadata(ROLES_KEY, [UserTypes.MODERATOR])
export const AdminOrModerator = () =>
    SetMetadata(ROLES_KEY, [UserTypes.ADMIN, UserTypes.MODERATOR])

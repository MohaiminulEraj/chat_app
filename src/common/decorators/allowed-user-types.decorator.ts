import { SetMetadata } from '@nestjs/common'
import { UserTypes } from 'src/modules/user/data/user-type.enum'

export const ALLOWED_USER_TYPES = 'allowedUserTypes'
export const AllowedUserTypes = (...allowedUserTypes: UserTypes[]) =>
    SetMetadata(ALLOWED_USER_TYPES, allowedUserTypes)

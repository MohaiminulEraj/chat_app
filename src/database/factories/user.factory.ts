import { User } from 'src/modules/user/entities/user.entity'
import { define } from 'typeorm-seeding'
define(User, () => {
    return new User()
})

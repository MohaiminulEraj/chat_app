import * as bcrypt from 'bcryptjs'
import { UserTypes } from 'src/modules/user/data/user-type.enum'
import { User } from 'src/modules/user/entities/user.entity'
import { DataSource } from 'typeorm'
import { Factory, Seeder } from 'typeorm-seeding'

export class UserSeed implements Seeder {
    public async run(factory: Factory, dataSource: DataSource) {
        const userRepository = dataSource.getRepository(User)

        const salt = bcrypt.genSaltSync(10)
        const hashedPassword = await bcrypt.hash('123456', salt)

        // FIRST TRUNCATE THE USER TABLE
        await userRepository.delete({})

        // Create a superadmin user
        const user = await factory(User)({
            email: 'admin@example.com',
            // Remove username: 'superadmin',
            password: hashedPassword,
            userType: UserTypes.ADMIN,
            isEmailVerified: true,
            name: 'Super Admin'
        }).make()

        await factory(User)().create(user)
    }
}

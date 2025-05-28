import * as bcrypt from 'bcryptjs'
import { UserTypes } from 'src/modules/users/data/user-type.enum'
import { User } from 'src/modules/users/entities/user.entity'
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
        const user = await factory(User)().make({
            username: 'superadmin',
            name: 'Super Admin',
            email: 'superadmin@example.com',
            phoneNumber: '+1234567890',
            password: hashedPassword,
            isEmailVerified: true,
            isPhoneVerified: true,
        })

        await factory(User)().create(user)
    }
}

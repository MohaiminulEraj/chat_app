import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateUserTypeToEnum1733859200000 implements MigrationInterface {
    name = 'UpdateUserTypeToEnum1733859200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum type first
        await queryRunner.query(`
            CREATE TYPE "user_usertype_enum" AS ENUM('user', 'admin', 'moderator')
        `)

        // Update the column to use the enum type
        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "userType" TYPE "user_usertype_enum"
            USING "userType"::"user_usertype_enum"
        `)

        // Set NOT NULL constraint and default value
        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "userType" SET NOT NULL
        `)

        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "userType" SET DEFAULT 'user'
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert back to VARCHAR
        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "userType" DROP DEFAULT
        `)

        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "userType" DROP NOT NULL
        `)

        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "userType" TYPE character varying
            USING "userType"::character varying
        `)

        // Drop the enum type
        await queryRunner.query(`
            DROP TYPE "user_usertype_enum"
        `)

        // Set back to original default
        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "userType" SET DEFAULT 'user'
        `)
    }
}

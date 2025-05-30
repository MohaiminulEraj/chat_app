import { ConfigService } from '@nestjs/config'
import { config } from 'dotenv'
import { DataSource, DataSourceOptions } from 'typeorm'

config()

const configService = new ConfigService()

class AppDataSource extends DataSource {
    constructor(options: DataSourceOptions) {
        super(options)
    }

    async initialize(): Promise<this> {
        // Prevent super.initialize() from automatically synchronizing
        // by temporarily overriding the synchronize option if it was set.
        const originalSynchronizeOption = this.options.synchronize
        const originalDropSchemaOption = this.options.dropSchema

        ;(this.options as any).synchronize = false // Disable auto-sync for super.initialize()

        await super.initialize() // Establishes connection

        // Now that the connection is established, create the extension
        try {
            await this.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
        } catch (error) {
            console.error('Failed to create uuid-ossp extension:', error)
            // Depending on your needs, you might want to throw the error
            // or handle it if the extension might be created by another process/user
        }

        // If the original options intended to synchronize, do it now
        if (originalSynchronizeOption) {
            console.log(
                `Synchronizing schema (drop schema: ${originalDropSchemaOption})...`
            )
            await this.synchronize(originalDropSchemaOption)
        }

        return this
    }
}

export default new AppDataSource({
    type: 'postgres',
    host: configService.get('DB_HOST'),
    port: parseInt(configService.get('DB_PORT') || '5432', 10),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_NAME'),
    entities: ['src/**/*.entity{.ts,.js}'],
    migrationsRun: true, // Recommended to be false if synchronize is true for dev
    synchronize: true, // Enable sync for development (will be handled by custom initialize)
    dropSchema: true, // Drop schema for development (will be handled by custom initialize)
    migrations: ['src/database/migrations/*{.ts,.js}'],
    subscribers: []
})

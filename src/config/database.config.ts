import { ConfigService } from '@nestjs/config'
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm'

export const databaseConfig: TypeOrmModuleAsyncOptions = {
    useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        synchronize: true, // Temporarily enable for initial setup
        dropSchema: true // WARNING: This will drop all tables on startup - remove after first run!
    }),
    inject: [ConfigService]
}

import { MailerModule } from '@nestjs-modules/mailer'
import {
    MiddlewareConsumer,
    Module,
    NestModule,
    RequestMethod
} from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { MongooseModule } from '@nestjs/mongoose'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserModule } from 'src/modules/user/user.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { LoggerMiddleware } from './common/middleware/logger.middleware'
import { RequestContextMiddleware } from './common/middleware/request-context.middleware'
import smtpConfig from './config/smtp.config'
import { AuthModule } from './modules/auth/auth.module'
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module'
import { ConversationModule } from './modules/conversation/conversation.module'
import { EmailService } from './modules/email/services/email.service'
import { FriendshipModule } from './modules/friendship/friendship.module'
import { GiftModule } from './modules/gift/gift.module'
import { GroupModule } from './modules/group/group.module'
import { RoomModule } from './modules/room/room.module'
import { SocketIOModule } from './modules/socketio/socketio.module'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [
                () => ({
                    envFilePath: ['.env'],
                    cache: true
                })
            ]
        }),
        ThrottlerModule.forRootAsync({
            useFactory: async () => ({
                throttlers: [
                    {
                        ttl:
                            parseInt(
                                process.env.RATE_LIMITER_TIME_TO_LEAVE,
                                10
                            ) || 60000, // default to 60000 if env variable not present
                        limit:
                            parseInt(process.env.RATE_LIMITER_MAX_TRY, 10) || 2 // default to 2 if env variable not present
                    }
                ]
            })
        }),
        MailerModule.forRootAsync(smtpConfig),
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST,
            port: +process.env.DB_PORT,
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            autoLoadEntities: true,
            synchronize: true, // dev only: sync schema from entities
            dropSchema: false // dev only: drop & recreate database on each run
        }),
        ScheduleModule.forRoot(),
        AuthModule,
        UserModule,
        FriendshipModule,
        GroupModule,
        SocketIOModule, // New unified Socket.IO implementation
        CloudinaryModule,
        // UploadModule,
        RoomModule, // Add RoomModule to imports
        GiftModule, // Add GiftModule to imports
        ConversationModule,
        // OtpModule // Add OtpModule to imports
        MongooseModule.forRoot(process.env.MONGO_URI, {
            connectionFactory: (connection) => {
                connection.on('connected', () => {
                    console.log('MongoDB connected successfully')
                })
                connection.on('error', (error) => {
                    console.error('MongoDB connection error:', error)
                })
                return connection
            }
        })
    ],
    controllers: [AppController],
    providers: [
        AppService,
        EmailService,
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor
        }
    ],
    exports: [TypeOrmModule]
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestContextMiddleware, LoggerMiddleware)
            .exclude(
                { path: 'auth/login', method: RequestMethod.POST },
                { path: 'auth/registration', method: RequestMethod.POST }
            )
            .forRoutes('*') // Apply to all routes
    }
}

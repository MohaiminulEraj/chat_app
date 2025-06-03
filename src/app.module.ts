import { MailerModule } from '@nestjs-modules/mailer'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserModule } from 'src/modules/user/user.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import smtpConfig from './config/smtp.config'
import { AuthModule } from './modules/auth/auth.module'
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module'
import { EmailService } from './modules/email/services/email.service'
import { FriendshipModule } from './modules/friendship/friendship.module'
import { GiftModule } from './modules/gift/gift.module'
import { GroupModule } from './modules/group/group.module'
import { RoomModule } from './modules/room/room.module'
import { WebsocketModule } from './modules/websocket/websocket.module'
@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: ['.env'],
            isGlobal: true,
            cache: true
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
        WebsocketModule,
        CloudinaryModule,
        // UploadModule,
        RoomModule, // Add RoomModule to imports
        GiftModule // Add GiftModule to imports
        // OtpModule // Add OtpModule to imports
        // MongooseModule.forRoot(
        //     process.env.MONGODB_URI || 'mongodb://localhost:27017/imo_chat'
        // )
    ],
    controllers: [AppController],
    providers: [AppService, EmailService],
    exports: [TypeOrmModule]
})
export class AppModule {}

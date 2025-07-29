import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { User } from '../user/entities/user.entity'
import { UserModule } from '../user/user.module'
import { ConversationController } from './conversation.controller'
// import { ConversationGateway } from './conversation.gateway' // Disabled - replaced by unified SocketIO
import { ConversationService } from './conversation.service'
import { Conversation } from './entities/conversation.entity'
import { Message, MessageSchema } from './schemas/message.schema'

@Module({
    imports: [
        TypeOrmModule.forFeature([Conversation, User]),
        MongooseModule.forFeature([
            { name: Message.name, schema: MessageSchema }
        ]),
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'your-secret-key',
            signOptions: { expiresIn: '1d' }
        }),
        UserModule,
        AuthModule
    ],
    controllers: [ConversationController],
    providers: [/* ConversationGateway, */ ConversationService], // Gateway disabled - replaced by unified SocketIO
    exports: [ConversationService]
})
export class ConversationModule {}

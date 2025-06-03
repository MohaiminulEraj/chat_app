import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Conversation } from './entities/conversation.entity'
import { MessageGateway } from './message.gateway'
import { MessageService } from './message.service'
import { Message, MessageSchema } from './schemas/message.schema'

@Module({
    imports: [
        TypeOrmModule.forFeature([Conversation]),
        MongooseModule.forFeature([
            { name: Message.name, schema: MessageSchema }
        ])
    ],
    providers: [MessageService, MessageGateway],
    exports: [MessageService]
})
export class MessageModule {}

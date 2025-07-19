import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Conversation } from './entities/conversation.entity'
// import { MessageGateway } from './message.gateway' // Temporarily disabled to fix WebSocket conflicts
import { MessageService } from './message.service'
import { Message, MessageSchema } from './schemas/message.schema'

@Module({
    imports: [
        TypeOrmModule.forFeature([Conversation]),
        MongooseModule.forFeature([
            { name: Message.name, schema: MessageSchema }
        ])
    ],
    providers: [
        MessageService
        // MessageGateway // Temporarily disabled to fix WebSocket conflicts
    ],
    exports: [MessageService]
})
export class MessageModule {}

import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Conversation } from './entities/conversation.entity'
import { Message } from './entities/message.entity'
import { MessageService } from './message.service'

@Module({
    imports: [TypeOrmModule.forFeature([Conversation, Message])],
    providers: [
        MessageService
        // MessageGateway // Temporarily disabled to fix WebSocket conflicts
    ],
    exports: [MessageService]
})
export class MessageModule {}

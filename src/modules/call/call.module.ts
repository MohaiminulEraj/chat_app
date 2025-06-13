import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ConversationModule } from '../conversation/conversation.module'
import { CallGateway } from './call.gateway'

@Module({
    imports: [AuthModule, ConversationModule],
    providers: [CallGateway],
    exports: []
})
export class CallModule {}

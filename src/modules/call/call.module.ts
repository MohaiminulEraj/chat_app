import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ConversationModule } from '../conversation/conversation.module'
// import { CallGateway } from './call.gateway' // Temporarily disabled to fix WebSocket conflicts

@Module({
    imports: [AuthModule, ConversationModule],
    providers: [
        // CallGateway // Temporarily disabled to fix WebSocket conflicts
    ],
    exports: []
})
export class CallModule {}

import { Module } from '@nestjs/common'
// import { WebsocketGateway } from './websocket.gateway' // Temporarily disabled to fix WebSocket conflicts
import { WebsocketService } from './websocket.service'

@Module({
    providers: [
        // WebsocketGateway, // Temporarily disabled to fix WebSocket conflicts
        WebsocketService
    ],
    exports: []
})
export class WebsocketModule {}

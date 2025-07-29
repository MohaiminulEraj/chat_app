import { Module } from '@nestjs/common'
// import { WebsocketGateway } from './websocket.gateway' // Disabled - replaced by unified SocketIO
import { WebsocketService } from './websocket.service'

@Module({
    providers: [
        // WebsocketGateway, // Disabled - replaced by unified SocketIO
        WebsocketService
    ],
    exports: []
})
export class WebsocketModule {}

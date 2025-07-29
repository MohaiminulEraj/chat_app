import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class SocketIOService {
    private logger = new Logger('SocketIOService')

    // Room management utilities
    public generateRoomName(type: 'user' | 'conversation' | 'group', id: string): string {
        return `${type}:${id}`
    }

    // Message utilities
    public formatMessage(message: any, sender: any) {
        return {
            ...message,
            sender: {
                uuid: sender.uuid,
                name: sender.name,
                avatarUrl: sender.avatarUrl
            },
            timestamp: new Date()
        }
    }

    // Event utilities
    public createEventPayload(event: string, data: any, metadata?: any) {
        return {
            event,
            data,
            metadata,
            timestamp: new Date()
        }
    }

    // Logging utilities
    public logSocketEvent(socketId: string, event: string, data?: any) {
        this.logger.log(`Socket ${socketId} - Event: ${event}`, data ? JSON.stringify(data) : '')
    }

    public logSocketError(socketId: string, event: string, error: any) {
        this.logger.error(`Socket ${socketId} - Event: ${event} - Error: ${error.message}`)
    }
}

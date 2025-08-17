import { Injectable } from '@nestjs/common'
import { RtcTokenBuilder, RtcRole } from 'agora-token'

@Injectable()
export class AgoraService {
    private readonly appID = process.env.AGORA_APP_ID
    private readonly appCertificate = process.env.AGORA_APP_CERTIFICATE

    generateToken(
        channelName: string,
        uid: number,
        role: number,
        expireSeconds = 7200 // default to 2 hours
    ): string {
        const currentTimestamp = Math.floor(Date.now() / 1000)
        const privilegeExpire = currentTimestamp + expireSeconds

        return RtcTokenBuilder.buildTokenWithUid(
            this.appID,
            this.appCertificate,
            channelName,
            uid,
            role,
            privilegeExpire,
            privilegeExpire
        )
    }

    generateTokenWithString(
        channelName: string,
        userId: string,
        role: number,
        expireSeconds = 7200 // default to 2 hour
    ): string {
        const currentTimestamp = Math.floor(Date.now() / 1000)
        const privilegeExpire = currentTimestamp + expireSeconds

        // Convert string to number for uid (simple hash)
        const uid = this.stringToUid(userId)

        return RtcTokenBuilder.buildTokenWithUid(
            this.appID,
            this.appCertificate,
            channelName,
            uid,
            role,
            privilegeExpire,
            privilegeExpire
        )
    }

    /**
     * Convert string to a numeric UID
     */
    private stringToUid(str: string): number {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = (hash << 5) - hash + char
            hash = hash & hash // Convert to 32-bit integer
        }
        return Math.abs(hash) % 2147483647 // Ensure positive and within range
    }

    /**
     * Get available Agora roles with client-friendly mappings
     */
    getRoles() {
        return {
            PUBLISHER: RtcRole.PUBLISHER, // Can publish and subscribe
            BROADCASTER: RtcRole.PUBLISHER, // Alias for publisher (broadcaster role)
            SUBSCRIBER: RtcRole.SUBSCRIBER, // Can only subscribe
            AUDIENCE: RtcRole.SUBSCRIBER, // Alias for subscriber (audience role)

            // String mappings for client compatibility
            publisher: RtcRole.PUBLISHER,
            broadcaster: RtcRole.PUBLISHER,
            subscriber: RtcRole.SUBSCRIBER,
            audience: RtcRole.SUBSCRIBER
        }
    }
}

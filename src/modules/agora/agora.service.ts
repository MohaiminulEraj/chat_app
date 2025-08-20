import { Injectable, Logger } from '@nestjs/common'
import { RtcTokenBuilder, RtcRole } from 'agora-token'

@Injectable()
export class AgoraService {
    private readonly logger = new Logger(AgoraService.name)
    private readonly appID = process.env.AGORA_APP_ID
    private readonly appCertificate = process.env.AGORA_APP_CERTIFICATE

    constructor() {
        // Validate Agora configuration on service initialization
        this.validateConfiguration()
    }

    private validateConfiguration() {
        if (!this.appID) {
            this.logger.error('❌ AGORA_APP_ID is not configured')
            throw new Error('Agora App ID is required but not configured')
        }

        if (!this.appCertificate) {
            this.logger.error('❌ AGORA_APP_CERTIFICATE is not configured')
            throw new Error(
                'Agora App Certificate is required but not configured'
            )
        }

        // Validate format
        if (this.appID.length !== 32) {
            this.logger.warn(
                `⚠️ App ID length is ${this.appID.length}, expected 32 characters`
            )
        }

        if (this.appCertificate.length !== 32) {
            this.logger.warn(
                `⚠️ App Certificate length is ${this.appCertificate.length}, expected 32 characters`
            )
        }

        this.logger.log('✅ Agora configuration validated successfully')
        this.logger.log(`📱 App ID: ${this.appID}`)
        this.logger.log(
            `🔑 Certificate: ${this.appCertificate.substring(0, 8)}...`
        )
        this.logger.log(
            `🎯 Ready to generate AccessToken2 (007) format tokens for user accounts`
        )
    }

    generateToken(
        channelName: string,
        uid: number,
        role: number,
        expireSeconds = 7200 // default to 2 hours
    ): string {
        try {
            if (!channelName) {
                throw new Error('Channel name is required')
            }

            if (uid < 0 || uid > 2147483647) {
                throw new Error('UID must be between 0 and 2147483647')
            }

            const currentTimestamp = Math.floor(Date.now() / 1000)
            const privilegeExpire = currentTimestamp + expireSeconds

            this.logger.log(
                `🎯 Generating token for channel: ${channelName}, UID: ${uid}, Role: ${role}`
            )

            const token = RtcTokenBuilder.buildTokenWithUid(
                this.appID,
                this.appCertificate,
                channelName,
                uid,
                role,
                privilegeExpire,
                privilegeExpire
            )

            this.logger.log(
                `✅ Token generated successfully for channel: ${channelName}`
            )
            return token
        } catch (error) {
            this.logger.error(`❌ Failed to generate token: ${error.message}`)
            throw error
        }
    }

    generateTokenWithString(
        channelName: string,
        userId: string,
        role: number,
        expireSeconds = 7200 // default to 2 hours
    ): string {
        try {
            if (!channelName) {
                throw new Error('Channel name is required')
            }

            if (!userId) {
                throw new Error('User ID is required')
            }

            const currentTimestamp = Math.floor(Date.now() / 1000)
            const privilegeExpire = currentTimestamp + expireSeconds

            this.logger.log(
                `🎯 Generating token with USER ACCOUNT for channel: ${channelName}, UserAccount: ${userId}, Role: ${role}`
            )

            // Use buildTokenWithUserAccount for string-based user accounts
            // This is CRITICAL - Flutter uses joinChannelWithUserAccount so token must be built with userAccount
            const token = RtcTokenBuilder.buildTokenWithUserAccount(
                this.appID,
                this.appCertificate,
                channelName,
                userId, // Use the string userAccount directly
                role,
                privilegeExpire,
                privilegeExpire
            )

            this.logger.log(
                `✅ Token generated successfully for channel: ${channelName}, UserAccount: ${userId}`
            )
            this.logger.log(
                `🔍 Token format: ${token.substring(0, 10)}... (length: ${token.length})`
            )

            return token
        } catch (error) {
            this.logger.error(
                `❌ Failed to generate token for user account ${userId}: ${error.message}`
            )
            throw error
        }
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

    /**
     * Validate if a token is expired (utility method)
     */
    isTokenExpired(token: string): boolean {
        try {
            // This is a basic check - in production you might want to decode and check the actual expiry
            return false // Placeholder - actual implementation would decode the token
        } catch (error) {
            this.logger.warn(
                `⚠️ Failed to validate token expiry: ${error.message}`
            )
            return true // Assume expired if we can't validate
        }
    }

    /**
     * Get current Agora configuration (without sensitive data)
     */
    getConfiguration() {
        return {
            appId: this.appID,
            certificateConfigured: !!this.appCertificate,
            certificateLength: this.appCertificate?.length || 0,
            appIdLength: this.appID?.length || 0,
            timestamp: new Date().toISOString(),
            roles: this.getRoles()
        }
    }

    /**
     * Get detailed debug configuration info
     */
    getDebugConfiguration() {
        this.logger.log('🔍 Getting Agora debug configuration')

        return {
            hasAppId: !!this.appID,
            hasAppCertificate: !!this.appCertificate,
            appIdLength: this.appID?.length || 0,
            appCertificateLength: this.appCertificate?.length || 0,
            appIdPreview: this.appID
                ? `${this.appID.substring(0, 8)}...`
                : null,
            certificatePreview: this.appCertificate
                ? `${this.appCertificate.substring(0, 8)}...`
                : null,
            roles: this.getRoles(),
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        }
    }
}

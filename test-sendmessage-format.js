#!/usr/bin/env node

/**
 * SendMessage Response Format Test
 * Tests the new sendMessage response format
 */

const io = require('socket.io-client')

// Configuration
const SERVER_URL = 'http://localhost:3000'
const NAMESPACE = '/chat'
const JWT_TOKEN = 'your-jwt-token-here'
const RECIPIENT_ID = 'recipient-user-id-here'

class SendMessageFormatTester {
    constructor() {
        this.socket = null
    }

    async connect() {
        console.log('🔌 Connecting to chat server...\n')

        this.socket = io(`${SERVER_URL}${NAMESPACE}`)

        return new Promise((resolve, reject) => {
            this.socket.on('connected', (response) => {
                console.log('✅ Connected:', response)
                this.setupListeners()
                resolve()
            })

            this.socket.on('connect_error', (error) => {
                console.error('❌ Connection error:', error)
                reject(error)
            })
        })
    }

    setupListeners() {
        this.socket.on('newMessage', (data) => {
            console.log('📥 Received newMessage event:')
            console.log(JSON.stringify(data, null, 2))
        })
    }

    async authenticate() {
        console.log('🔐 Authenticating...\n')

        return new Promise((resolve) => {
            this.socket.emit('authenticate', { token: JWT_TOKEN })

            this.socket.on('authenticate', (response) => {
                console.log('✅ Authentication response:', response)
                resolve(response)
            })

            setTimeout(resolve, 1000)
        })
    }

    async testSendMessage() {
        console.log('💬 Testing sendMessage with new response format...\n')

        const messageData = {
            recipientId: RECIPIENT_ID,
            type: 'text',
            content: 'Hey everyone! 👋'
        }

        console.log('📤 Sending message:', messageData)

        return new Promise((resolve) => {
            this.socket.emit('sendMessage', messageData, (response) => {
                console.log('\n📦 SendMessage Response:')
                console.log('='.repeat(50))
                console.log(JSON.stringify(response, null, 2))
                console.log('='.repeat(50))

                // Verify the new response format
                this.verifyResponseFormat(response)

                setTimeout(resolve, 2000)
            })
        })
    }

    verifyResponseFormat(response) {
        console.log('\n🔍 Verifying Response Format:')

        const expectedFields = [
            '_id',
            'group',
            'sender',
            'content',
            'avatar',
            'createdAt',
            'updatedAt',
            '__v'
        ]

        const senderFields = ['_id', 'name', 'role']

        let isValid = true

        // Check main fields
        expectedFields.forEach((field) => {
            if (response.hasOwnProperty(field)) {
                console.log(
                    `✅ ${field}: ${typeof response[field]} - ${response[field]}`
                )
            } else {
                console.log(`❌ Missing field: ${field}`)
                isValid = false
            }
        })

        // Check sender object fields
        if (response.sender) {
            console.log('\n👤 Sender Object:')
            senderFields.forEach((field) => {
                if (response.sender.hasOwnProperty(field)) {
                    console.log(
                        `✅ sender.${field}: ${typeof response.sender[field]} - ${response.sender[field]}`
                    )
                } else {
                    console.log(`❌ Missing sender field: ${field}`)
                    isValid = false
                }
            })
        } else {
            console.log('❌ Missing sender object')
            isValid = false
        }

        // Show expected format
        console.log('\n📋 Expected Format:')
        console.log(`{
  "_id": "64f2a7c4d93e8b001c23a111",
  "group": "64f2a7c4d93e8b001c23a001",
  "sender": {
    "_id": "64f2a7c4d93e8b001c23a555",
    "name": "Rafi Zaman",
    "role": "member"
  },
  "content": "Hey everyone! 👋",
  "avatar": "https://example.com/uploads/avatars/rafi.png",
  "createdAt": "2025-08-16T10:22:30.123Z",
  "updatedAt": "2025-08-16T10:22:30.123Z",
  "__v": 0
}`)

        if (isValid) {
            console.log('\n✅ Response format is CORRECT! 🎉')
        } else {
            console.log('\n❌ Response format has ISSUES! ⚠️')
        }
    }

    async runTest() {
        try {
            await this.connect()
            await this.authenticate()
            await this.testSendMessage()

            console.log('\n✅ Test completed successfully!')
        } catch (error) {
            console.error('❌ Test failed:', error)
        } finally {
            this.disconnect()
            process.exit(0)
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect()
        }
    }
}

// Usage instructions
if (require.main === module) {
    console.log('💬 SendMessage Response Format Tester\n')

    if (
        JWT_TOKEN === 'your-jwt-token-here' ||
        RECIPIENT_ID === 'recipient-user-id-here'
    ) {
        console.log('❌ Please update the configuration variables:')
        console.log('- JWT_TOKEN: Your valid JWT token')
        console.log('- RECIPIENT_ID: Target user UUID')
        console.log('- SERVER_URL: Update if using different host/port\n')
        process.exit(1)
    }

    const tester = new SendMessageFormatTester()
    tester.runTest()
}

module.exports = SendMessageFormatTester

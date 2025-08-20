#!/usr/bin/env node

/**
 * Enhanced SendMessage Test Client
 * Tests the sendMessage socket event with user profile information
 */

const io = require('socket.io-client')

// Configuration
const SERVER_URL = 'http://localhost:3000'
const NAMESPACE = '/chat'
const JWT_TOKEN_ALICE = 'your-alice-jwt-token-here'
const JWT_TOKEN_BOB = 'your-bob-jwt-token-here'
const ALICE_USER_ID = 'your-alice-user-id-here'
const BOB_USER_ID = 'your-bob-user-id-here'

class EnhancedChatTester {
    constructor() {
        this.aliceSocket = null
        this.bobSocket = null
        this.conversationId = null
        this.testResults = []
    }

    async connectUsers() {
        console.log('🔌 Connecting users to chat server...\n')

        // Connect Alice
        this.aliceSocket = io(`${SERVER_URL}${NAMESPACE}`)
        await this.waitForConnection(this.aliceSocket, 'Alice')

        // Connect Bob
        this.bobSocket = io(`${SERVER_URL}${NAMESPACE}`)
        await this.waitForConnection(this.bobSocket, 'Bob')

        this.setupListeners()
    }

    waitForConnection(socket, username) {
        return new Promise((resolve, reject) => {
            socket.on('connected', (response) => {
                console.log(`✅ ${username} connected:`, response)
                resolve()
            })

            socket.on('connect_error', (error) => {
                console.error(`❌ ${username} connection error:`, error)
                reject(error)
            })
        })
    }

    setupListeners() {
        // Alice's listeners
        this.aliceSocket.on('newMessage', (data) => {
            console.log(
                '📥 Alice received newMessage:',
                JSON.stringify(data, null, 2)
            )
            this.testResults.push({
                event: 'newMessage',
                receiver: 'Alice',
                data: data,
                timestamp: new Date().toISOString()
            })
        })

        // Bob's listeners
        this.bobSocket.on('newMessage', (data) => {
            console.log(
                '📥 Bob received newMessage:',
                JSON.stringify(data, null, 2)
            )
            this.testResults.push({
                event: 'newMessage',
                receiver: 'Bob',
                data: data,
                timestamp: new Date().toISOString()
            })
        })

        // Authentication responses
        this.aliceSocket.on('authenticate', (response) => {
            console.log('🔐 Alice authentication response:', response)
        })

        this.bobSocket.on('authenticate', (response) => {
            console.log('🔐 Bob authentication response:', response)
        })
    }

    async authenticateUsers() {
        console.log('🔐 Authenticating users...\n')

        // Authenticate Alice
        const aliceAuth = await this.authenticate(
            this.aliceSocket,
            JWT_TOKEN_ALICE,
            'Alice'
        )

        // Authenticate Bob
        const bobAuth = await this.authenticate(
            this.bobSocket,
            JWT_TOKEN_BOB,
            'Bob'
        )

        console.log('✅ Both users authenticated successfully\n')
    }

    authenticate(socket, token, username) {
        return new Promise((resolve) => {
            socket.emit('authenticate', { token })

            socket.on('authenticate', (response) => {
                console.log(`✅ ${username} authenticated:`, response)
                resolve(response)
            })

            // Wait a moment for authentication
            setTimeout(resolve, 1000)
        })
    }

    async testDirectMessage() {
        console.log('💬 Testing direct message with user profile...\n')

        return new Promise((resolve) => {
            // Alice sends message to Bob
            const messageData = {
                recipientId: BOB_USER_ID,
                type: 'text',
                content:
                    'Hello Bob! This message should include my profile information 👋'
            }

            console.log('📤 Alice sending message:', messageData)

            this.aliceSocket.emit('sendMessage', messageData, (response) => {
                console.log(
                    '📦 SendMessage response from Alice:',
                    JSON.stringify(response, null, 2)
                )

                // Verify response structure
                if (
                    response.success &&
                    response.message &&
                    response.message.sender
                ) {
                    console.log(
                        '✅ Response includes sender profile information:'
                    )
                    console.log('   - ID:', response.message.sender.id)
                    console.log('   - Name:', response.message.sender.name)
                    console.log(
                        '   - Display Name:',
                        response.message.sender.displayName
                    )
                    console.log('   - Email:', response.message.sender.email)
                    console.log(
                        '   - Avatar URL:',
                        response.message.sender.avatarUrl
                    )
                    console.log(
                        '   - Country:',
                        response.message.sender.country
                    )
                    console.log('   - Level:', response.message.sender.level)
                    console.log('   - Badge:', response.message.sender.badge)
                    console.log(
                        '   - Frame ID:',
                        response.message.sender.frameId
                    )
                } else {
                    console.log(
                        '❌ Response missing sender profile information'
                    )
                }

                this.testResults.push({
                    event: 'sendMessageResponse',
                    sender: 'Alice',
                    data: response,
                    timestamp: new Date().toISOString()
                })

                // Store conversation ID for future tests
                if (response.conversation) {
                    this.conversationId = response.conversation
                }

                setTimeout(resolve, 2000)
            })
        })
    }

    async testConversationMessage() {
        if (!this.conversationId) {
            console.log(
                '⚠️ No conversation ID available, skipping conversation message test'
            )
            return
        }

        console.log('💬 Testing conversation message with user profile...\n')

        return new Promise((resolve) => {
            // Bob replies in the existing conversation
            const messageData = {
                conversationId: this.conversationId,
                type: 'text',
                content:
                    'Hi Alice! Nice to meet you. This reply should also include my profile! 😊'
            }

            console.log('📤 Bob sending reply:', messageData)

            this.bobSocket.emit('sendMessage', messageData, (response) => {
                console.log(
                    '📦 SendMessage response from Bob:',
                    JSON.stringify(response, null, 2)
                )

                // Verify response structure
                if (
                    response.success &&
                    response.message &&
                    response.message.sender
                ) {
                    console.log(
                        '✅ Response includes sender profile information:'
                    )
                    console.log('   - ID:', response.message.sender.id)
                    console.log('   - Name:', response.message.sender.name)
                    console.log(
                        '   - Display Name:',
                        response.message.sender.displayName
                    )
                    console.log('   - Email:', response.message.sender.email)
                    console.log(
                        '   - Avatar URL:',
                        response.message.sender.avatarUrl
                    )
                    console.log(
                        '   - Country:',
                        response.message.sender.country
                    )
                    console.log('   - Level:', response.message.sender.level)
                } else {
                    console.log(
                        '❌ Response missing sender profile information'
                    )
                }

                this.testResults.push({
                    event: 'sendMessageResponse',
                    sender: 'Bob',
                    data: response,
                    timestamp: new Date().toISOString()
                })

                setTimeout(resolve, 2000)
            })
        })
    }

    async testFileMessage() {
        console.log('📎 Testing file message with user profile...\n')

        return new Promise((resolve) => {
            // Alice sends a file message
            const messageData = {
                conversationId: this.conversationId,
                type: 'file',
                content: 'Check out this file!',
                fileUrl: 'https://example.com/sample-file.pdf'
            }

            console.log('📤 Alice sending file message:', messageData)

            this.aliceSocket.emit('sendMessage', messageData, (response) => {
                console.log(
                    '📦 SendMessage response for file:',
                    JSON.stringify(response, null, 2)
                )

                this.testResults.push({
                    event: 'sendMessageResponse',
                    sender: 'Alice',
                    messageType: 'file',
                    data: response,
                    timestamp: new Date().toISOString()
                })

                setTimeout(resolve, 2000)
            })
        })
    }

    async runAllTests() {
        try {
            console.log('🚀 Starting Enhanced SendMessage Tests...\n')

            await this.connectUsers()
            await this.authenticateUsers()
            await this.testDirectMessage()
            await this.testConversationMessage()
            await this.testFileMessage()

            console.log('\n✅ All tests completed!')
            console.log('\n📊 Test Results Summary:')
            console.log(`Total events captured: ${this.testResults.length}`)

            const eventCounts = this.testResults.reduce((acc, result) => {
                acc[result.event] = (acc[result.event] || 0) + 1
                return acc
            }, {})

            Object.entries(eventCounts).forEach(([event, count]) => {
                console.log(`  - ${event}: ${count}`)
            })

            // Verify profile information was included
            const messagesWithProfile = this.testResults.filter(
                (result) =>
                    result.event === 'sendMessageResponse' &&
                    result.data?.message?.sender?.name
            )

            console.log(
                `\n👤 Messages with profile information: ${messagesWithProfile.length}`
            )

            if (messagesWithProfile.length > 0) {
                console.log(
                    '✅ User profile information successfully included in responses!'
                )
            } else {
                console.log('❌ No user profile information found in responses')
            }
        } catch (error) {
            console.error('❌ Test failed:', error)
        } finally {
            this.disconnect()
            process.exit(0)
        }
    }

    disconnect() {
        if (this.aliceSocket) {
            this.aliceSocket.disconnect()
        }
        if (this.bobSocket) {
            this.bobSocket.disconnect()
        }
    }
}

// Usage instructions
if (require.main === module) {
    console.log('💬 Enhanced SendMessage Test Client\n')

    if (
        JWT_TOKEN_ALICE === 'your-alice-jwt-token-here' ||
        JWT_TOKEN_BOB === 'your-bob-jwt-token-here' ||
        ALICE_USER_ID === 'your-alice-user-id-here' ||
        BOB_USER_ID === 'your-bob-user-id-here'
    ) {
        console.log(
            '❌ Please update the configuration variables at the top of this file:'
        )
        console.log('- JWT_TOKEN_ALICE: Valid JWT token for Alice')
        console.log('- JWT_TOKEN_BOB: Valid JWT token for Bob')
        console.log("- ALICE_USER_ID: Alice's user UUID")
        console.log("- BOB_USER_ID: Bob's user UUID")
        console.log('- SERVER_URL: Update if using different host/port\n')
        process.exit(1)
    }

    const tester = new EnhancedChatTester()
    tester.runAllTests()
}

module.exports = EnhancedChatTester

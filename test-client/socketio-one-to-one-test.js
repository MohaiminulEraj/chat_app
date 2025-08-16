#!/usr/bin/env node

/**
 * Socket.IO One-to-One Chat Test Client
 *
 * This script demonstrates all the one-to-one real-time communication endpoints
 * for the unified Socket.IO system.
 *
 * Usage:
 *   node socketio-one-to-one-test.js
 *
 * Prerequisites:
 *   - Server running on http://localhost:3000
 *   - Valid JWT tokens for test users
 *   - Users must be friends to send direct messages
 */

const { io } = require('socket.io-client')

class OneToOneChatTester {
    constructor(config) {
        this.serverUrl = config.serverUrl || 'http://localhost:3000'
        this.user1Token = config.user1Token
        this.user2Token = config.user2Token
        this.user1Socket = null
        this.user2Socket = null
        this.user1Id = null
        this.user2Id = null
        this.conversationId = null
        this.currentCallId = null

        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        }
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString()
        const prefix =
            {
                info: 'ℹ️ ',
                success: '✅',
                error: '❌',
                warning: '⚠️ '
            }[type] || 'ℹ️ '

        console.log(`[${timestamp}] ${prefix} ${message}`)
    }

    addTestResult(testName, passed, details = '') {
        this.testResults.tests.push({
            name: testName,
            passed,
            details,
            timestamp: new Date().toISOString()
        })

        if (passed) {
            this.testResults.passed++
            this.log(`Test passed: ${testName}`, 'success')
        } else {
            this.testResults.failed++
            this.log(`Test failed: ${testName} - ${details}`, 'error')
        }
    }

    async connectUser(userNum, token) {
        return new Promise((resolve, reject) => {
            const socket = io(this.serverUrl, {
                transports: ['websocket', 'polling'],
                timeout: 10000
            })

            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'))
            }, 15000)

            socket.on('connect', () => {
                clearTimeout(timeout)
                this.log(`User ${userNum} connected to server`)

                // Authenticate immediately
                socket.emit('authenticate', { token }, (response) => {
                    if (response.success) {
                        this.log(
                            `User ${userNum} authenticated as ${response.userId}`
                        )
                        if (userNum === 1) {
                            this.user1Id = response.userId
                        } else {
                            this.user2Id = response.userId
                        }
                        resolve(socket)
                    } else {
                        reject(
                            new Error(
                                `Authentication failed: ${response.error}`
                            )
                        )
                    }
                })
            })

            socket.on('connect_error', (error) => {
                clearTimeout(timeout)
                reject(error)
            })

            socket.on('error', (error) => {
                this.log(
                    `User ${userNum} socket error: ${error.message}`,
                    'error'
                )
            })

            socket.on('disconnect', (reason) => {
                this.log(`User ${userNum} disconnected: ${reason}`, 'warning')
            })
        })
    }

    setupEventListeners(socket, userNum) {
        // Authentication events
        socket.on('authenticated', (data) => {
            this.log(
                `User ${userNum} authentication confirmed: ${data.message}`
            )
        })

        socket.on('authenticationError', (data) => {
            this.log(`User ${userNum} auth error: ${data.message}`, 'error')
        })

        // Message events
        socket.on('newDirectMessage', (data) => {
            this.log(
                `User ${userNum} received message: "${data.message.content}" from ${data.message.sender.name}`
            )
            this.conversationId = data.conversationId

            // Mark as read after receiving
            setTimeout(() => {
                socket.emit('markMessagesAsRead', {
                    conversationId: data.conversationId,
                    messageIds: [data.message.id]
                })
            }, 1000)
        })

        socket.on('messagesRead', (data) => {
            this.log(
                `User ${userNum} - Messages read by ${data.readBy.name} in conversation ${data.conversationId}`
            )
        })

        // Typing events
        socket.on('userTyping', (data) => {
            const action = data.isTyping ? 'started typing' : 'stopped typing'
            this.log(`User ${userNum} - ${data.userName} ${action}`)
        })

        // Call events
        socket.on('incomingCall', (data) => {
            this.log(
                `User ${userNum} - Incoming ${data.callType} call from ${data.caller.name}`
            )
            this.currentCallId = data.callId

            // Auto-accept calls for testing
            setTimeout(() => {
                socket.emit('respondToCall', {
                    callId: data.callId,
                    response: 'accept',
                    callerId: data.caller.uuid
                })
            }, 1000)
        })

        socket.on('callResponse', (data) => {
            this.log(
                `User ${userNum} - Call ${data.response}ed by ${data.responder.name}`
            )
        })

        socket.on('callEnded', (data) => {
            this.log(`User ${userNum} - Call ended by ${data.endedBy.name}`)
            this.currentCallId = null
        })

        // Status events
        socket.on('userStatusChanged', (data) => {
            this.log(
                `User ${userNum} - User ${data.userId} status changed to ${data.status}`
            )
        })
    }

    async runTest(testName, testFunction) {
        try {
            await testFunction()
            this.addTestResult(testName, true)
            return true
        } catch (error) {
            this.addTestResult(testName, false, error.message)
            return false
        }
    }

    async sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    async runAllTests() {
        this.log('🚀 Starting Socket.IO One-to-One Chat Tests')
        this.log('='.repeat(60))

        try {
            // Test 1: Connection and Authentication
            await this.runTest(
                'User Connection and Authentication',
                async () => {
                    if (!this.user1Token || !this.user2Token) {
                        throw new Error(
                            'JWT tokens are required. Please set user1Token and user2Token.'
                        )
                    }

                    this.user1Socket = await this.connectUser(
                        1,
                        this.user1Token
                    )
                    this.user2Socket = await this.connectUser(
                        2,
                        this.user2Token
                    )

                    // Setup event listeners
                    this.setupEventListeners(this.user1Socket, 1)
                    this.setupEventListeners(this.user2Socket, 2)

                    await this.sleep(2000) // Wait for authentication to complete
                }
            )

            // Test 2: Direct Messaging
            await this.runTest('Direct Message Sending', async () => {
                if (!this.user1Id || !this.user2Id) {
                    throw new Error('User IDs not available')
                }

                const messagePromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(
                        () => reject(new Error('Message not received')),
                        10000
                    )

                    this.user2Socket.once('newDirectMessage', (data) => {
                        clearTimeout(timeout)
                        if (data.message.content === 'Hello from User 1!') {
                            resolve(data)
                        } else {
                            reject(new Error('Wrong message content received'))
                        }
                    })
                })

                this.user1Socket.emit(
                    'sendDirectMessage',
                    {
                        recipientId: this.user2Id,
                        type: 'text',
                        content: 'Hello from User 1!'
                    },
                    (response) => {
                        if (!response.success) {
                            throw new Error(
                                `Message send failed: ${response.error}`
                            )
                        }
                    }
                )

                await messagePromise
            })

            // Test 3: Bidirectional Messaging
            await this.runTest('Bidirectional Messaging', async () => {
                const replyPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(
                        () => reject(new Error('Reply not received')),
                        10000
                    )

                    this.user1Socket.once('newDirectMessage', (data) => {
                        clearTimeout(timeout)
                        if (
                            data.message.content === 'Hello back from User 2!'
                        ) {
                            resolve(data)
                        } else {
                            reject(new Error('Wrong reply content received'))
                        }
                    })
                })

                this.user2Socket.emit(
                    'sendDirectMessage',
                    {
                        recipientId: this.user1Id,
                        type: 'text',
                        content: 'Hello back from User 2!'
                    },
                    (response) => {
                        if (!response.success) {
                            throw new Error(
                                `Reply send failed: ${response.error}`
                            )
                        }
                    }
                )

                await replyMessage
            })

            // Test 4: Typing Indicators
            await this.runTest('Typing Indicators', async () => {
                if (!this.conversationId) {
                    throw new Error('No conversation ID available')
                }

                const typingPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(
                        () =>
                            reject(new Error('Typing indicator not received')),
                        10000
                    )

                    this.user2Socket.once('userTyping', (data) => {
                        clearTimeout(timeout)
                        if (
                            data.isTyping &&
                            data.conversationId === this.conversationId
                        ) {
                            resolve(data)
                        } else {
                            reject(new Error('Wrong typing indicator received'))
                        }
                    })
                })

                this.user1Socket.emit('typing', {
                    conversationId: this.conversationId,
                    isTyping: true
                })

                await typingPromise

                // Stop typing
                this.user1Socket.emit('typing', {
                    conversationId: this.conversationId,
                    isTyping: false
                })
            })

            // Test 5: Voice Call
            await this.runTest(
                'Voice Call Initiation and Response',
                async () => {
                    const callId = `test_call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

                    const callPromise = new Promise((resolve, reject) => {
                        const timeout = setTimeout(
                            () =>
                                reject(new Error('Call response not received')),
                            15000
                        )

                        this.user1Socket.once('callResponse', (data) => {
                            clearTimeout(timeout)
                            if (
                                data.response === 'accept' &&
                                data.callId === callId
                            ) {
                                resolve(data)
                            } else {
                                reject(new Error('Call was not accepted'))
                            }
                        })
                    })

                    this.user1Socket.emit(
                        'initiateCall',
                        {
                            recipientId: this.user2Id,
                            callType: 'voice',
                            callId: callId
                        },
                        (response) => {
                            if (!response.success) {
                                throw new Error(
                                    `Call initiation failed: ${response.error}`
                                )
                            }
                        }
                    )

                    await callPromise
                    this.currentCallId = callId
                }
            )

            // Test 6: End Call
            await this.runTest('Call Termination', async () => {
                if (!this.currentCallId) {
                    throw new Error('No active call to end')
                }

                const endCallPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(
                        () =>
                            reject(
                                new Error('Call end notification not received')
                            ),
                        10000
                    )

                    this.user2Socket.once('callEnded', (data) => {
                        clearTimeout(timeout)
                        resolve(data)
                    })
                })

                this.user1Socket.emit(
                    'endCall',
                    {
                        callId: this.currentCallId,
                        participants: [this.user1Id, this.user2Id]
                    },
                    (response) => {
                        if (!response.success) {
                            throw new Error(
                                `Call end failed: ${response.error}`
                            )
                        }
                    }
                )

                await endCallPromise
            })

            // Test 7: Status Updates
            await this.runTest('User Status Updates', async () => {
                const statusPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(
                        () => reject(new Error('Status change not received')),
                        10000
                    )

                    this.user2Socket.once('userStatusChanged', (data) => {
                        clearTimeout(timeout)
                        if (
                            data.status === 'away' &&
                            data.userId === this.user1Id
                        ) {
                            resolve(data)
                        } else {
                            reject(new Error('Wrong status change received'))
                        }
                    })
                })

                this.user1Socket.emit(
                    'updateStatus',
                    {
                        status: 'away'
                    },
                    (response) => {
                        if (!response.success) {
                            throw new Error(
                                `Status update failed: ${response.error}`
                            )
                        }
                    }
                )

                await statusPromise
            })

            // Test 8: Message Read Receipts
            await this.runTest('Message Read Receipts', async () => {
                if (!this.conversationId) {
                    throw new Error('No conversation ID available')
                }

                // Send a new message to get a message ID
                const newMessagePromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(
                        () => reject(new Error('New message not received')),
                        10000
                    )

                    this.user2Socket.once('newDirectMessage', (data) => {
                        clearTimeout(timeout)
                        resolve(data.message.id)
                    })
                })

                this.user1Socket.emit('sendDirectMessage', {
                    recipientId: this.user2Id,
                    type: 'text',
                    content: 'Test message for read receipt'
                })

                const messageId = await newMessagePromise

                // Now test read receipt
                const readReceiptPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(
                        () => reject(new Error('Read receipt not received')),
                        10000
                    )

                    this.user1Socket.once('messagesRead', (data) => {
                        clearTimeout(timeout)
                        if (data.conversationId === this.conversationId) {
                            resolve(data)
                        } else {
                            reject(new Error('Wrong read receipt received'))
                        }
                    })
                })

                this.user2Socket.emit('markMessagesAsRead', {
                    conversationId: this.conversationId,
                    messageIds: [messageId]
                })

                await readReceiptPromise
            })

            // Test 9: Error Handling
            await this.runTest(
                'Error Handling for Invalid Operations',
                async () => {
                    // Test sending message to non-existent user
                    const errorPromise = new Promise((resolve, reject) => {
                        const timeout = setTimeout(
                            () =>
                                reject(
                                    new Error('Error response not received')
                                ),
                            10000
                        )

                        this.user1Socket.emit(
                            'sendDirectMessage',
                            {
                                recipientId: 'non-existent-uuid',
                                type: 'text',
                                content: 'This should fail'
                            },
                            (response) => {
                                clearTimeout(timeout)
                                if (!response.success) {
                                    resolve(response)
                                } else {
                                    reject(
                                        new Error(
                                            'Expected error but operation succeeded'
                                        )
                                    )
                                }
                            }
                        )
                    })

                    await errorPromise
                }
            )
        } catch (error) {
            this.log(`Critical test failure: ${error.message}`, 'error')
        } finally {
            // Cleanup
            if (this.user1Socket) {
                this.user1Socket.disconnect()
            }
            if (this.user2Socket) {
                this.user2Socket.disconnect()
            }
        }

        this.printTestResults()
    }

    printTestResults() {
        this.log('📊 Test Results Summary')
        this.log('='.repeat(60))
        this.log(`Total Tests: ${this.testResults.tests.length}`)
        this.log(`Passed: ${this.testResults.passed}`, 'success')
        this.log(
            `Failed: ${this.testResults.failed}`,
            this.testResults.failed > 0 ? 'error' : 'success'
        )
        this.log(
            `Success Rate: ${((this.testResults.passed / this.testResults.tests.length) * 100).toFixed(1)}%`
        )

        if (this.testResults.failed > 0) {
            this.log('\n❌ Failed Tests:')
            this.testResults.tests
                .filter((test) => !test.passed)
                .forEach((test) => {
                    this.log(`  • ${test.name}: ${test.details}`, 'error')
                })
        }

        this.log('\n✅ Passed Tests:')
        this.testResults.tests
            .filter((test) => test.passed)
            .forEach((test) => {
                this.log(`  • ${test.name}`, 'success')
            })
    }
}

// Configuration and Usage
const config = {
    serverUrl: 'http://localhost:3000',
    user1Token: process.env.USER1_JWT_TOKEN || 'YOUR_USER1_JWT_TOKEN_HERE',
    user2Token: process.env.USER2_JWT_TOKEN || 'YOUR_USER2_JWT_TOKEN_HERE'
}

// Check if tokens are provided
if (
    config.user1Token === 'YOUR_USER1_JWT_TOKEN_HERE' ||
    config.user2Token === 'YOUR_USER2_JWT_TOKEN_HERE'
) {
    console.log('⚠️  Please provide JWT tokens:')
    console.log('   Option 1: Set environment variables:')
    console.log('     export USER1_JWT_TOKEN="your-token-1"')
    console.log('     export USER2_JWT_TOKEN="your-token-2"')
    console.log('   Option 2: Edit this file and replace token placeholders')
    console.log('   Option 3: Get tokens from Postman login requests')
    console.log('')
    console.log('💡 To get tokens:')
    console.log('   1. Use Postman collection login endpoints')
    console.log(
        '   2. Or run: curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d \'{"email":"user@test.com","password":"password123"}\''
    )
    process.exit(1)
}

// Run the tests
const tester = new OneToOneChatTester(config)
tester
    .runAllTests()
    .then(() => {
        console.log('🏁 All tests completed!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('💥 Test runner failed:', error.message)
        process.exit(1)
    })

// Export for use as module
module.exports = OneToOneChatTester

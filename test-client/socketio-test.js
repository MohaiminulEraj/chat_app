const { io } = require('socket.io-client');

class SocketIOTester {
    constructor() {
        this.sockets = {};
        this.users = {};
        this.testResults = [];
    }

    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
    }

    async connectUser(userId, token) {
        return new Promise((resolve, reject) => {
            const socket = io('http://localhost:3000', {
                transports: ['websocket', 'polling']
            });

            this.sockets[userId] = socket;

            socket.on('connect', () => {
                this.log(`User ${userId}: Connected to server`);
                
                // Authenticate
                socket.emit('authenticate', { token }, (response) => {
                    if (response.success) {
                        this.users[userId] = response.userId;
                        this.log(`User ${userId}: Authenticated as ${response.userId}`);
                        resolve(socket);
                    } else {
                        this.log(`User ${userId}: Authentication failed - ${response.error}`);
                        reject(new Error(response.error));
                    }
                });
            });

            socket.on('disconnect', () => {
                this.log(`User ${userId}: Disconnected`);
            });

            socket.on('error', (error) => {
                this.log(`User ${userId}: Error - ${error.message}`);
                reject(error);
            });

            // Set up event listeners
            this.setupEventListeners(socket, userId);
        });
    }

    setupEventListeners(socket, userId) {
        socket.on('authenticated', (data) => {
            this.log(`User ${userId}: Authentication successful - ${data.message}`);
        });

        socket.on('authenticationError', (data) => {
            this.log(`User ${userId}: Authentication error - ${data.message}`);
        });

        socket.on('newDirectMessage', (data) => {
            this.log(`User ${userId}: Received direct message in conversation ${data.conversationId}`);
            this.log(`  Message: ${JSON.stringify(data.message)}`);
        });

        socket.on('newGroupMessage', (data) => {
            this.log(`User ${userId}: Received group message in group ${data.groupId}`);
            this.log(`  Message: ${JSON.stringify(data.message)}`);
        });

        socket.on('userTyping', (data) => {
            this.log(`User ${userId}: ${data.userName} is ${data.isTyping ? 'typing' : 'stopped typing'}`);
        });

        socket.on('userStatusChanged', (data) => {
            this.log(`User ${userId}: User ${data.userId} status changed to ${data.status}`);
        });

        socket.on('userJoinedGroup', (data) => {
            this.log(`User ${userId}: ${data.user.name} joined group ${data.groupId}`);
        });

        socket.on('userLeftGroup', (data) => {
            this.log(`User ${userId}: ${data.user.name} left group ${data.groupId}`);
        });

        socket.on('incomingCall', (data) => {
            this.log(`User ${userId}: Incoming ${data.callType} call from ${data.caller.name}`);
            
            // Auto-accept calls for testing
            socket.emit('respondToCall', {
                callId: data.callId,
                response: 'accept',
                callerId: data.caller.uuid
            });
        });

        socket.on('callResponse', (data) => {
            this.log(`User ${userId}: Call ${data.response}ed by ${data.responder.name}`);
        });

        socket.on('callEnded', (data) => {
            this.log(`User ${userId}: Call ended by ${data.endedBy.name}`);
        });

        socket.on('messagesRead', (data) => {
            this.log(`User ${userId}: Messages read by ${data.readBy.name}`);
        });
    }

    async testDirectMessage(senderId, recipientId, message) {
        return new Promise((resolve, reject) => {
            const socket = this.sockets[senderId];
            
            socket.emit('sendDirectMessage', {
                recipientId: recipientId,
                type: 'text',
                content: message
            }, (response) => {
                if (response.success) {
                    this.log(`✅ Direct message test passed: ${senderId} -> ${recipientId}`);
                    resolve(response);
                } else {
                    this.log(`❌ Direct message test failed: ${response.error}`);
                    reject(new Error(response.error));
                }
            });
        });
    }

    async testGroupMessage(senderId, groupId, message) {
        return new Promise((resolve, reject) => {
            const socket = this.sockets[senderId];
            
            socket.emit('sendGroupMessage', {
                groupId: groupId,
                type: 'text',
                content: message
            }, (response) => {
                if (response.success) {
                    this.log(`✅ Group message test passed: ${senderId} -> Group ${groupId}`);
                    resolve(response);
                } else {
                    this.log(`❌ Group message test failed: ${response.error}`);
                    reject(new Error(response.error));
                }
            });
        });
    }

    async testJoinGroup(userId, groupId) {
        return new Promise((resolve, reject) => {
            const socket = this.sockets[userId];
            
            socket.emit('joinGroup', { groupId }, (response) => {
                if (response.success) {
                    this.log(`✅ Join group test passed: ${userId} joined Group ${groupId}`);
                    resolve(response);
                } else {
                    this.log(`❌ Join group test failed: ${response.error}`);
                    reject(new Error(response.error));
                }
            });
        });
    }

    async testVoiceCall(callerId, recipientId) {
        return new Promise((resolve, reject) => {
            const socket = this.sockets[callerId];
            const callId = `test_call_${Date.now()}`;
            
            socket.emit('initiateCall', {
                recipientId: recipientId,
                callType: 'voice',
                callId: callId
            }, (response) => {
                if (response.success) {
                    this.log(`✅ Voice call test passed: ${callerId} -> ${recipientId}`);
                    resolve(response);
                } else {
                    this.log(`❌ Voice call test failed: ${response.error}`);
                    reject(new Error(response.error));
                }
            });
        });
    }

    async testStatusUpdate(userId, status) {
        return new Promise((resolve, reject) => {
            const socket = this.sockets[userId];
            
            socket.emit('updateStatus', { status }, (response) => {
                if (response.success) {
                    this.log(`✅ Status update test passed: ${userId} -> ${status}`);
                    resolve(response);
                } else {
                    this.log(`❌ Status update test failed: ${response.error}`);
                    reject(new Error(response.error));
                }
            });
        });
    }

    disconnect(userId) {
        if (this.sockets[userId]) {
            this.sockets[userId].disconnect();
            delete this.sockets[userId];
            delete this.users[userId];
            this.log(`User ${userId}: Disconnected and cleaned up`);
        }
    }

    disconnectAll() {
        Object.keys(this.sockets).forEach(userId => {
            this.disconnect(userId);
        });
    }
}

// Example usage and test runner
async function runTests() {
    const tester = new SocketIOTester();
    
    console.log('🚀 Starting Unified Socket.IO System Tests');
    console.log('='.repeat(50));

    try {
        // Note: You'll need to replace these with actual JWT tokens
        const testTokens = {
            user1: 'YOUR_JWT_TOKEN_1',
            user2: 'YOUR_JWT_TOKEN_2'
        };

        console.log('📝 Test 1: Connection and Authentication');
        // await tester.connectUser('user1', testTokens.user1);
        // await tester.connectUser('user2', testTokens.user2);

        console.log('📝 Test 2: Direct Messaging');
        // await tester.testDirectMessage('user1', tester.users.user2, 'Hello from User 1!');
        // await tester.testDirectMessage('user2', tester.users.user1, 'Hello back from User 2!');

        console.log('📝 Test 3: Group Operations');
        // const testGroupId = 'test-group-uuid';
        // await tester.testJoinGroup('user1', testGroupId);
        // await tester.testJoinGroup('user2', testGroupId);
        // await tester.testGroupMessage('user1', testGroupId, 'Group message from User 1');

        console.log('📝 Test 4: Voice Calls');
        // await tester.testVoiceCall('user1', tester.users.user2);

        console.log('📝 Test 5: Status Updates');
        // await tester.testStatusUpdate('user1', 'away');
        // await tester.testStatusUpdate('user2', 'busy');

        console.log('✅ All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        tester.disconnectAll();
        console.log('🧹 Cleanup completed');
    }
}

// Export for use in other scripts
module.exports = SocketIOTester;

// Run tests if this script is executed directly
if (require.main === module) {
    console.log('⚠️  To run tests, uncomment the test lines in runTests() function');
    console.log('⚠️  and provide valid JWT tokens for your test users');
    // runTests();
}

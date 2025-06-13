const io = require('socket.io-client')
const axios = require('axios')

const API_URL = 'http://localhost:3000'

async function testChat() {
    try {
        // 1. Login two users
        console.log('1. Logging in users...')
        const user1Login = await axios.post(`${API_URL}/auth/login`, {
            username: 'testuser1',
            password: 'password123'
        })
        const user1Token = user1Login.data.data.access_token
        const user1Id = user1Login.data.data.user.uuid

        const user2Login = await axios.post(`${API_URL}/auth/login`, {
            username: 'testuser2',
            password: 'password123'
        })
        const user2Token = user2Login.data.data.access_token
        const user2Id = user2Login.data.data.user.uuid

        console.log('Users logged in successfully')

        // 2. Connect WebSocket for User 1
        console.log('\n2. Connecting User 1 to WebSocket...')
        const socket1 = io(`${API_URL}/chat`, {
            transports: ['websocket']
        })

        await new Promise((resolve) => {
            socket1.on('connect', () => {
                console.log('User 1 connected')
                socket1.emit(
                    'authenticate',
                    { token: user1Token },
                    (response) => {
                        console.log('User 1 authenticated:', response)
                        resolve()
                    }
                )
            })
        })

        // 3. Connect WebSocket for User 2
        console.log('\n3. Connecting User 2 to WebSocket...')
        const socket2 = io(`${API_URL}/chat`, {
            transports: ['websocket']
        })

        await new Promise((resolve) => {
            socket2.on('connect', () => {
                console.log('User 2 connected')
                socket2.emit(
                    'authenticate',
                    { token: user2Token },
                    (response) => {
                        console.log('User 2 authenticated:', response)
                        resolve()
                    }
                )
            })
        })

        // 4. Set up message listeners
        console.log('\n4. Setting up message listeners...')
        socket1.on('newMessage', (data) => {
            console.log('User 1 received message:', data.message.content)
        })

        socket2.on('newMessage', (data) => {
            console.log('User 2 received message:', data.message.content)
        })

        // 5. Send messages
        console.log('\n5. Sending messages...')

        // User 1 sends to User 2
        await new Promise((resolve) => {
            socket1.emit(
                'sendMessage',
                {
                    recipientId: user2Id,
                    type: 'text',
                    content: 'Hello User 2! This is a test message.'
                },
                (response) => {
                    console.log('User 1 send message response:', response)
                    resolve()
                }
            )
        })

        await new Promise((resolve) => setTimeout(resolve, 1000))

        // User 2 sends to User 1
        await new Promise((resolve) => {
            socket2.emit(
                'sendMessage',
                {
                    recipientId: user1Id,
                    type: 'text',
                    content: 'Hi User 1! I received your message.'
                },
                (response) => {
                    console.log('User 2 send message response:', response)
                    resolve()
                }
            )
        })

        await new Promise((resolve) => setTimeout(resolve, 1000))

        // 6. Test typing indicator
        console.log('\n6. Testing typing indicator...')
        socket1.emit('typing', {
            conversationId: 'CONVERSATION_ID',
            isTyping: true
        })

        await new Promise((resolve) => setTimeout(resolve, 2000))

        // 7. Disconnect
        console.log('\n7. Disconnecting...')
        socket1.disconnect()
        socket2.disconnect()

        console.log('\nTest completed successfully!')
    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message)
    }
}

// Run the test
testChat()

const io = require('socket.io-client')

// Configuration
const SERVER_URL = 'http://localhost:3000' // Adjust to your server URL
const TEST_TOKEN = 'your-test-token-here' // Replace with actual token
const ROOM_ID = 'test-room-id' // Replace with actual room ID
const USER_ID = 'test-user-id' // Replace with actual user ID

console.log('🔧 Socket.IO Room Gift Testing Tool')
console.log('=====================================')

// Create socket connection
const socket = io(SERVER_URL, {
    transports: ['websocket'],
    auth: {
        token: TEST_TOKEN
    }
})

socket.on('connect', () => {
    console.log(`✅ Connected with socket ID: ${socket.id}`)

    // Join room first
    console.log(`📥 Joining room: ${ROOM_ID}`)
    socket.emit('joinRoom', {
        userId: USER_ID,
        roomID: ROOM_ID
    })

    // Set up event listeners
    socket.on('joinRoomResponse', (data) => {
        console.log(
            '📥 joinRoomResponse received:',
            JSON.stringify(data, null, 2)
        )
    })

    socket.on('roomError', (data) => {
        console.log('❌ roomError received:', JSON.stringify(data, null, 2))
    })

    socket.on('roomGiftSent', (data) => {
        console.log('🎁 roomGiftSent received:', JSON.stringify(data, null, 2))
        console.log('✅ SUCCESS: Flutter should receive this event!')
    })

    socket.on('giftSent', (data) => {
        console.log('📤 giftSent received:', JSON.stringify(data, null, 2))
    })

    socket.on('giftReceived', (data) => {
        console.log('📨 giftReceived received:', JSON.stringify(data, null, 2))
    })

    socket.on('giftActivityUpdate', (data) => {
        console.log(
            '📊 giftActivityUpdate received:',
            JSON.stringify(data, null, 2)
        )
    })

    // Wait a moment then send a test gift
    setTimeout(() => {
        console.log('\n🎁 Sending test gift...')
        socket.emit('sendGiftInRoom', {
            giftId: 'test-gift-id',
            receiverId: ['test-receiver-id'],
            quantity: 1,
            message: 'Test gift message',
            roomId: ROOM_ID
        })
    }, 2000)
})

socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server')
})

socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message)
})

// Keep the script running
process.on('SIGINT', () => {
    console.log('\n👋 Closing connection...')
    socket.disconnect()
    process.exit(0)
})

console.log(`🔄 Connecting to ${SERVER_URL}...`)
console.log('Press Ctrl+C to exit')

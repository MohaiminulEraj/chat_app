const io = require('socket.io-client')

// Test configuration
const SERVER_URL = 'ws://localhost:3001'
const TEST_USER_ID = 'test-user-456'
const TEST_ROOM_ID = 'test-room-789'
const TEST_SEAT_INDEX = 1

console.log('🚀 Testing new sitInSeat response format...')
console.log(`📡 Connecting to: ${SERVER_URL}`)
console.log(`👤 Test User ID: ${TEST_USER_ID}`)
console.log(`🏠 Test Room ID: ${TEST_ROOM_ID}`)
console.log(`🪑 Test Seat Index: ${TEST_SEAT_INDEX}`)

const socket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    timeout: 5000
})

socket.on('connect', () => {
    console.log('✅ Connected to server')
    console.log(`🆔 Socket ID: ${socket.id}`)

    // Setup user first
    console.log('\n📝 Setting up user...')
    socket.emit('setup', TEST_USER_ID)

    // Wait a bit then join room
    setTimeout(() => {
        console.log('\n🚪 Joining room...')
        socket.emit('joinRoom', {
            userId: TEST_USER_ID,
            roomID: TEST_ROOM_ID
        })
    }, 1000)

    // Wait a bit then try to sit in seat
    setTimeout(() => {
        console.log('\n🪑 Testing sitInSeat...')
        const sitData = {
            roomID: TEST_ROOM_ID,
            seatIndex: TEST_SEAT_INDEX,
            userId: TEST_USER_ID
        }
        console.log('   📤 Sending:', JSON.stringify(sitData, null, 2))
        socket.emit('sitInSeat', sitData)
    }, 3000)
})

// Listen for sitInSeat responses
socket.on('sitInSeatResponse', (data) => {
    console.log('\n📥 SIT IN SEAT RESPONSE:')
    console.log(
        '   Expected format: { status, user: { id, name, email, sitIndex, image } }'
    )
    console.log('   Received:')
    console.log('   ├─ status:', data.status)
    if (data.user) {
        console.log('   ├─ user.id:', data.user.id)
        console.log('   ├─ user.name:', data.user.name)
        console.log('   ├─ user.email:', data.user.email)
        console.log('   ├─ user.sitIndex:', data.user.sitIndex)
        console.log('   ├─ user.image:', data.user.image)
    }
    if (data.message) {
        console.log('   ├─ message:', data.message)
    }
    if (data.position) {
        console.log('   └─ position:', data.position)
    }
    console.log('   Full Data:', JSON.stringify(data, null, 2))
})

// Listen for joinRoom responses for comparison
socket.on('joinRoomResponse', (data) => {
    console.log('\n📥 JOIN ROOM RESPONSE (for comparison):')
    console.log('   Data:', JSON.stringify(data, null, 2))
})

// Listen for any errors
socket.on('error', (error) => {
    console.log('\n❌ SOCKET ERROR:')
    console.log('   Error:', JSON.stringify(error, null, 2))
})

socket.on('roomError', (error) => {
    console.log('\n❌ ROOM ERROR:')
    console.log('   Error:', JSON.stringify(error, null, 2))
})

socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message)
})

socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason)
})

// Keep alive for 10 seconds
setTimeout(() => {
    console.log('\n🔚 Test completed')
    socket.disconnect()
    process.exit(0)
}, 10000)

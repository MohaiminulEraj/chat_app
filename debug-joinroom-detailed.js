const io = require('socket.io-client')

// Test configuration
const SERVER_URL = 'ws://localhost:3001'
const TEST_USER_ID = 'test-user-123'
const TEST_ROOM_ID = 'test-room-456'

console.log('🚀 Starting detailed joinRoom debug test...')
console.log(`📡 Connecting to: ${SERVER_URL}`)
console.log(`👤 Test User ID: ${TEST_USER_ID}`)
console.log(`🏠 Test Room ID: ${TEST_ROOM_ID}`)

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
            roomId: TEST_ROOM_ID
        })
    }, 1000)
})

// Listen for joinRoomResponse
socket.on('joinRoomResponse', (data) => {
    console.log('\n📥 RECEIVED joinRoomResponse:')
    console.log('   Data:', JSON.stringify(data, null, 2))
    console.log('   Is null:', data === null)
    console.log('   Type:', typeof data)

    if (data) {
        console.log('   ✅ Participant data received!')
        console.log(`   👤 User: ${data.name} (${data.userId})`)
        console.log(`   🪑 Seat: ${data.seatIndex}`)
        console.log(`   🎤 Mic: ${data.micOn ? 'ON' : 'OFF'}`)
        console.log(`   🗣️ Speaking: ${data.isSpeaking ? 'YES' : 'NO'}`)
    } else {
        console.log('   ℹ️ User joined as observer (not seated)')
    }
})

// Listen for room error
socket.on('roomError', (error) => {
    console.log('\n❌ ROOM ERROR:')
    console.log('   Error:', JSON.stringify(error, null, 2))
})

// Listen for room data update
socket.on('roomDataUpdate', (data) => {
    console.log('\n📊 ROOM DATA UPDATE:')
    console.log('   Action:', data.action)
    console.log('   Participants count:', data.participants?.length || 0)
    console.log('   Is participant:', data.isParticipant)
    console.log(
        '   ℹ️ NOTE: joinRoomResponse will only be emitted if user is already seated'
    )
})

// Listen for sit in seat response
socket.on('sitInSeatResponse', (data) => {
    console.log('\n🪑 SIT IN SEAT RESPONSE:')
    console.log('   Data:', JSON.stringify(data, null, 2))
})

socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message)
})

socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason)
})

// Test sequence: Join room, then try to sit in seat
setTimeout(() => {
    console.log('\n🪑 Attempting to sit in seat 0...')
    console.log(
        '   ℹ️ This should trigger joinRoomResponse with participant data'
    )
    socket.emit('sitInSeat', {
        userId: TEST_USER_ID,
        roomID: TEST_ROOM_ID, // Use roomID for consistency
        seatIndex: 0
    })
}, 3000)

// Keep alive for 10 seconds
setTimeout(() => {
    console.log('\n🔚 Test completed')
    socket.disconnect()
    process.exit(0)
}, 10000)

const io = require('socket.io-client')

// Connect to the server
const socket = io('http://localhost:3001', {
    transports: ['websocket'],
    timeout: 10000
})

console.log('🔌 Connecting to Socket.IO server...')

// Connection events
socket.on('connect', () => {
    console.log('✅ Connected to server with ID:', socket.id)

    // Test the accept participant event
    setTimeout(() => {
        console.log('\n📤 Testing acceptParticipant event...')
        socket.emit('acceptParticipant', {
            roomId: 'test-room-id',
            participantId: 'test-participant-id',
            seatIndex: 1
        })
    }, 1000)

    // Test the reject participant event
    setTimeout(() => {
        console.log('\n📤 Testing rejectParticipant event...')
        socket.emit('rejectParticipant', {
            roomId: 'test-room-id',
            participantId: 'test-participant-id',
            reason: 'Room is full'
        })
    }, 2000)
})

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server')
})

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message)
})

// Listen for accept participant responses
socket.on('acceptParticipantResponse', (data) => {
    console.log('\n📥 ACCEPT PARTICIPANT RESPONSE:')
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
    console.log('   Full Data:', JSON.stringify(data, null, 2))
})

// Listen for reject participant responses
socket.on('rejectParticipantResponse', (data) => {
    console.log('\n📥 REJECT PARTICIPANT RESPONSE:')
    console.log(
        '   Expected format: { status, user: { id, name, email, sitIndex, image }, reason }'
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
    if (data.reason) {
        console.log('   ├─ reason:', data.reason)
    }
    if (data.message) {
        console.log('   ├─ message:', data.message)
    }
    console.log('   Full Data:', JSON.stringify(data, null, 2))
})

// Listen for other relevant events
socket.on('participantAccepted', (data) => {
    console.log(
        '\n📥 PARTICIPANT ACCEPTED BROADCAST:',
        JSON.stringify(data, null, 2)
    )
})

socket.on('participantRejected', (data) => {
    console.log(
        '\n📥 PARTICIPANT REJECTED BROADCAST:',
        JSON.stringify(data, null, 2)
    )
})

// Auto-disconnect after 10 seconds
setTimeout(() => {
    console.log('\n🔌 Disconnecting...')
    socket.disconnect()
    process.exit(0)
}, 10000)

console.log(
    '🎯 Script will test accept/reject participant events and display responses in the new format'
)
console.log('   Expected response format:')
console.log('   {')
console.log('     "status": "accepted|rejected",')
console.log('     "user": {')
console.log('       "id": "123",')
console.log('       "name": "John Doe",')
console.log('       "email": "johndoe@example.com",')
console.log('       "sitIndex": "1",')
console.log('       "image": "https://example.com/avatar.png"')
console.log('     }')
console.log('   }')

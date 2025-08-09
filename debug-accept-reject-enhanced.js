const io = require('socket.io-client')

// Configuration
const SERVER_URL = 'http://localhost:3000'
const ROOM_ID = '7205b8f-5805-4d27-9376-98df0c7ef7be' // Replace with your actual room ID
const HOST_USER_ID = 'b953f2fc-8e64-44a5-b0b0-a19abdab86bd' // Replace with actual host user ID
const PARTICIPANT_USER_ID = '1bf10e3c-9031-47d9-9fe3-ac3767ecf9e6' // Replace with actual participant user ID

console.log('🚀 Starting Accept Participant Test...')

// Host socket connection
const hostSocket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
})

// Participant socket connection
const participantSocket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
})

let testPhase = 0

// Helper function to wait
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function runTest() {
    try {
        console.log('\n📋 Test Phase 1: Setting up connections...')

        // Wait for connections
        await wait(1000)

        // Setup host
        console.log('🔧 Setting up host...')
        hostSocket.emit('setup', HOST_USER_ID)
        await wait(500)

        // Setup participant
        console.log('🔧 Setting up participant...')
        participantSocket.emit('setup', PARTICIPANT_USER_ID)
        await wait(500)

        // Host joins room
        console.log('🏠 Host joining room...')
        hostSocket.emit('roomID', { roomID: ROOM_ID, useId: HOST_USER_ID })
        await wait(1000)

        // Participant joins room as observer
        console.log('👁️ Participant joining room as observer...')
        participantSocket.emit('joinRoom', {
            userId: PARTICIPANT_USER_ID,
            roomID: ROOM_ID
        })
        await wait(1000)

        console.log(
            '\n📋 Test Phase 2: Participant tries to sit in locked seat...'
        )

        // Participant tries to sit in seat (should be added to waiting list)
        console.log('🪑 Participant attempting to sit in seat 0...')
        participantSocket.emit('sitInSeat', {
            roomId: ROOM_ID,
            seatIndex: 0,
            userId: PARTICIPANT_USER_ID
        })
        await wait(2000)

        console.log('\n📋 Test Phase 3: Host accepts participant...')

        // Host accepts participant (with seat index)
        console.log('✅ Host accepting participant for seat 0...')
        hostSocket.emit('acceptParticipant', {
            roomId: ROOM_ID,
            participantId: PARTICIPANT_USER_ID,
            seatIndex: 0
        })
        await wait(2000)

        console.log(
            '\n📋 Test Phase 4: Participant tries to join room again...'
        )

        // Participant should now be able to join/sit
        console.log('🔄 Participant attempting to join room again...')
        participantSocket.emit('joinRoom', {
            userId: PARTICIPANT_USER_ID,
            roomID: ROOM_ID
        })
        await wait(1000)

        console.log('\n✅ Test completed! Check the logs above for results.')
    } catch (error) {
        console.error('❌ Test failed:', error)
    } finally {
        console.log('\n🔌 Cleaning up connections...')
        hostSocket.disconnect()
        participantSocket.disconnect()
        process.exit(0)
    }
}

// Host socket event listeners
hostSocket.on('connect', () => {
    console.log('✅ Host connected:', hostSocket.id)
})

hostSocket.on('setupComplete', (data) => {
    console.log('🔧 Host setup complete:', data)
})

hostSocket.on('acceptParticipantResponse', (data) => {
    console.log('📤 Host received acceptParticipantResponse:')
    console.log('   Format: Standard accept/reject format')
    console.log('   Status:', data.status)
    console.log('   User ID:', data.user?.id)
    console.log('   User Name:', data.user?.name)
    console.log('   Seat Index:', data.user?.sitIndex)
    console.log('   Seated:', data.seated)
    console.log('   Message:', data.message)
    console.log('   Full Response:', JSON.stringify(data, null, 2))
})

hostSocket.on('participantAccepted', (data) => {
    console.log(
        '📣 Host received participantAccepted broadcast:',
        JSON.stringify(data, null, 2)
    )
})

hostSocket.on('seatUpdated', (data) => {
    console.log('🪑 Host received seatUpdated:', JSON.stringify(data, null, 2))
})

// Participant socket event listeners
participantSocket.on('connect', () => {
    console.log('✅ Participant connected:', participantSocket.id)
})

participantSocket.on('setupComplete', (data) => {
    console.log('🔧 Participant setup complete:', data)
})

participantSocket.on('sitInSeatResponse', (data) => {
    console.log(
        '🪑 Participant received sitInSeatResponse:',
        JSON.stringify(data, null, 2)
    )
})

participantSocket.on('participantAcceptanceNotification', (data) => {
    console.log(
        '🎉 Participant received acceptance notification:',
        JSON.stringify(data, null, 2)
    )
})

participantSocket.on('joinRoomResponse', (data) => {
    console.log('🏠 Participant received joinRoomResponse:')
    console.log('   Format: Flutter-compatible participant format')
    console.log('   User ID:', data.userId)
    console.log('   Name:', data.name)
    console.log('   Avatar:', data.avatar)
    console.log('   Seat Index:', data.seatIndex)
    console.log('   Is Speaking:', data.isSpeaking)
    console.log('   Mic On:', data.micOn)
    console.log('   Role:', data.role)
    console.log('   Full Response:', JSON.stringify(data, null, 2))
})

participantSocket.on('participantAccepted', (data) => {
    console.log(
        '📣 Participant received participantAccepted broadcast:',
        JSON.stringify(data, null, 2)
    )
})

participantSocket.on('seatUpdated', (data) => {
    console.log(
        '🪑 Participant received seatUpdated:',
        JSON.stringify(data, null, 2)
    )
})

// Error handlers
hostSocket.on('error', (error) => {
    console.error('❌ Host socket error:', error)
})

participantSocket.on('error', (error) => {
    console.error('❌ Participant socket error:', error)
})

// Start the test
hostSocket.on('connect', () => {
    participantSocket.on('connect', () => {
        setTimeout(runTest, 1000)
    })
})

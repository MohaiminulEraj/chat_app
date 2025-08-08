const { io } = require('socket.io-client')

// Test script to debug room events and seat operations
async function testRoomOperations() {
    console.log('🚀 Connecting to server...')

    const socket = io('ws://localhost:3000', {
        transports: ['websocket'],
        timeout: 20000
    })

    // Listen for all response events
    socket.on('joinRoomResponse', (response) => {
        console.log('📨 joinRoomResponse:', JSON.stringify(response, null, 2))

        if (response.status === 'success') {
            // Now try to sit in a seat first
            console.log('📨 Sending sitInSeat event...')
            socket.emit('sitInSeat', {
                roomID: 'test-room-id', // Using roomID for testing compatibility
                seatIndex: 0,
                userId: 'test-user-id'
            })
        }
    })

    socket.on('roomDataUpdate', (response) => {
        console.log('📨 roomDataUpdate:', JSON.stringify(response, null, 2))
    })

    socket.on('sitInSeatResponse', (response) => {
        console.log('📨 sitInSeatResponse:', JSON.stringify(response, null, 2))

        if (response.status !== 'error') {
            // Now try to get room comments
            console.log('📨 Sending getRoomComments event...')
            socket.emit('getRoomComments', {
                roomID: 'test-room-id', // Using roomID for testing compatibility
                userId: 'test-user-id',
                limit: 10,
                offset: 0
            })
        } else {
            console.log(
                '❌ Sit in seat failed, trying getRoomComments anyway...'
            )
            socket.emit('getRoomComments', {
                roomID: 'test-room-id',
                userId: 'test-user-id',
                limit: 10,
                offset: 0
            })
        }
    })

    socket.on('getRoomCommentsResponse', (response) => {
        console.log(
            '📨 getRoomCommentsResponse:',
            JSON.stringify(response, null, 2)
        )

        // Close connection after receiving response
        setTimeout(() => {
            socket.disconnect()
            process.exit(0)
        }, 1000)
    })

    socket.on('connect', () => {
        console.log('✅ Connected to server with socket ID:', socket.id)

        // First join a room
        console.log('📨 Sending joinRoom event...')
        socket.emit('joinRoom', {
            roomID: 'test-room-id', // Using roomID for testing compatibility
            userId: 'test-user-id'
        })
    })

    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error)
    })

    socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected:', reason)
    })

    // Add timeout in case no response is received
    setTimeout(() => {
        console.log('⏰ Timeout - No response received in 15 seconds')
        socket.disconnect()
        process.exit(1)
    }, 15000)
}

testRoomOperations().catch(console.error)

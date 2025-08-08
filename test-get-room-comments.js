const { io } = require('socket.io-client')

// Test script to debug getRoomComments event
async function testGetRoomComments() {
    console.log('🚀 Connecting to server...')

    const socket = io('ws://localhost:3000', {
        transports: ['websocket']
    })

    socket.on('connect', () => {
        console.log('✅ Connected to server with socket ID:', socket.id)

        // First join a room
        console.log('📨 Sending joinRoom event...')
        socket.emit('joinRoom', {
            roomId: 'test-room-id', // Replace with actual room ID
            userId: 'test-user-id' // Replace with actual user ID
        })
    })

    socket.on('joinRoom', (response) => {
        console.log('📨 joinRoom response:', JSON.stringify(response, null, 2))

        if (response.status === 'success') {
            // Now try to get room comments
            console.log('📨 Sending getRoomComments event...')
            socket.emit('getRoomComments', {
                roomId: 'test-room-id', // Replace with actual room ID
                userId: 'test-user-id', // Replace with actual user ID
                limit: 10,
                offset: 0
            })
        }
    })

    socket.on('getRoomComments', (response) => {
        console.log(
            '📨 getRoomComments response:',
            JSON.stringify(response, null, 2)
        )

        // Close connection after receiving response
        setTimeout(() => {
            socket.disconnect()
            process.exit(0)
        }, 1000)
    })

    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error)
    })

    socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected:', reason)
    })

    // Add timeout in case no response is received
    setTimeout(() => {
        console.log('⏰ Timeout - No response received')
        socket.disconnect()
        process.exit(1)
    }, 10000)
}

testGetRoomComments().catch(console.error)

const io = require('socket.io-client')

// Debug script to test joinRoom functionality
async function testJoinRoom() {
    console.log('🔧 Starting joinRoom debug test...')

    const socket = io('http://localhost:3000', {
        auth: {
            token: 'test-token-123' // You may need to adjust this
        },
        transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
        console.log('✅ Connected to server with socket ID:', socket.id)

        // First, set up the user
        socket.emit('setup', {
            userId: 'test-user-123',
            userName: 'Test User'
        })
    })

    socket.on('setupComplete', (data) => {
        console.log('✅ Setup completed:', data)

        // Now try to join a room
        console.log('📥 Sending joinRoom event...')
        socket.emit('joinRoom', {
            userId: 'test-user-123',
            roomId: 'test-room-123'
        })
    })

    socket.on('authenticated', (data) => {
        console.log('🔐 Authenticated:', data)
    })

    socket.on('setupError', (error) => {
        console.log('❌ Setup error:', error)
    })

    // Listen for joinRoomResponse
    socket.on('joinRoomResponse', (data) => {
        console.log(
            '🎉 joinRoomResponse received:',
            JSON.stringify(data, null, 2)
        )
    })

    socket.on('roomError', (error) => {
        console.log('❌ Room error:', error)
    })

    socket.on('roomDataUpdate', (data) => {
        console.log('📊 Room data update:', JSON.stringify(data, null, 2))
    })

    socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected:', reason)
    })

    socket.on('connect_error', (error) => {
        console.log('❌ Connection error:', error.message)
    })

    // Wait for 30 seconds then close
    setTimeout(() => {
        console.log('⏰ Test completed, closing connection...')
        socket.disconnect()
        process.exit(0)
    }, 30000)
}

testJoinRoom().catch(console.error)

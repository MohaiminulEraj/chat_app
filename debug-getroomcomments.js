const io = require('socket.io-client')

// Debug script to test getRoomComments functionality
async function testGetRoomComments() {
    console.log('🔧 Starting getRoomComments debug test...')

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

        // Join a room first
        console.log('📥 Sending joinRoom event...')
        socket.emit('joinRoom', {
            userId: 'test-user-123',
            roomId: 'test-room-123'
        })
    })

    socket.on('joinRoomResponse', (data) => {
        console.log(
            '🎉 joinRoomResponse received:',
            JSON.stringify(data, null, 2)
        )

        // Now try to get room comments
        console.log('📄 Sending getRoomComments event...')
        socket.emit('getRoomComments', {
            userId: 'test-user-123',
            roomId: 'test-room-123',
            limit: 10,
            offset: 0
        })
    })

    socket.on('authenticated', (data) => {
        console.log('🔐 Authenticated:', data)
    })

    socket.on('setupError', (error) => {
        console.log('❌ Setup error:', error)
    })

    // Listen for getRoomCommentsResponse
    socket.on('getRoomCommentsResponse', (data) => {
        console.log(
            '📝 getRoomCommentsResponse received:',
            JSON.stringify(data, null, 2)
        )

        if (data.status === 'success') {
            console.log(
                `✅ Success! Retrieved ${data.count} comments out of ${data.totalCount} total`
            )
            console.log('📄 Comments data:', data.data)
        } else {
            console.log('❌ Error:', data.message)
        }
    })

    socket.on('roomError', (error) => {
        console.log('❌ Room error:', error)
    })

    socket.on('roomDataUpdate', (data) => {
        console.log('📊 Room data update received')
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

testGetRoomComments().catch(console.error)

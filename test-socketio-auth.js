const { io } = require('socket.io-client')

// Test script to verify authentication is disabled
async function testSocketIOAuthentication() {
    console.log('🚀 Testing SocketIO Gateway (no auth)...')

    const socket = io('ws://localhost:3000', {
        transports: ['websocket'],
        timeout: 10000
    })

    socket.on('connect', () => {
        console.log(
            '✅ Connected to SocketIO server with socket ID:',
            socket.id
        )

        // Test the setup event without authentication
        console.log('📨 Sending setup event without any user info...')
        socket.emit('setup', {
            // No userId provided - should generate guest UUID
        })
    })

    socket.on('connected', (response) => {
        console.log('📨 connected event:', JSON.stringify(response, null, 2))
    })

    socket.on('setupComplete', (response) => {
        console.log(
            '📨 setupComplete event:',
            JSON.stringify(response, null, 2)
        )

        // Close connection after successful setup
        setTimeout(() => {
            console.log(
                '🔌 Testing disconnect (should not cause UUID errors)...'
            )
            socket.disconnect()
        }, 2000)
    })

    socket.on('setupError', (response) => {
        console.log('❌ setupError event:', JSON.stringify(response, null, 2))
        socket.disconnect()
        process.exit(1)
    })

    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error)
        process.exit(1)
    })

    socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected:', reason)
        console.log(
            '✅ Test completed - should see no UUID errors in server logs'
        )
        process.exit(0)
    })

    // Add timeout
    setTimeout(() => {
        console.log('⏰ Timeout - Test failed')
        socket.disconnect()
        process.exit(1)
    }, 8000)
}

testSocketIOAuthentication().catch(console.error)

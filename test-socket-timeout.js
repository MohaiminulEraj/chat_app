const io = require('socket.io-client')

console.log('🔧 Starting Socket.IO Connection Test...')
console.log('📡 Target Server: http://103.190.136.200:3000')

const socket = io('http://103.190.136.200:3000', {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
})

let connectionStartTime = Date.now()

// Connection events
socket.on('connect', () => {
    const connectionTime = Date.now() - connectionStartTime
    console.log(`✅ Connected to server in ${connectionTime}ms`)
    console.log(`📋 Socket ID: ${socket.id}`)
    console.log(`🚀 Transport: ${socket.io.engine.transport.name}`)

    // Test ping immediately
    console.log('🏓 Sending ping...')
    socket.emit('ping')

    // Test connection check
    console.log('🔍 Sending connection check...')
    socket.emit('connection_check')

    // Test heartbeat
    console.log('💓 Sending heartbeat...')
    socket.emit('heartbeat')
})

// Server response events
socket.on('connected', (data) => {
    console.log('🎉 Received connected event from server:')
    console.log(JSON.stringify(data, null, 2))
})

socket.on('connection_established', (data) => {
    console.log('🔗 Received connection_established event:')
    console.log(JSON.stringify(data, null, 2))
})

socket.on('connect_success', (data) => {
    console.log('✨ Received connect_success event:')
    console.log(JSON.stringify(data, null, 2))
})

socket.on('connectionError', (data) => {
    console.log('❌ Received connectionError event:')
    console.log(JSON.stringify(data, null, 2))
})

// Health check responses
socket.on('pong', (data) => {
    console.log('🏓 Received pong from server:', data)
})

socket.on('heartbeat_ack', (data) => {
    console.log('💓 Received heartbeat acknowledgment:', data)
})

socket.on('connection_status', (data) => {
    console.log('🔍 Received connection status:')
    console.log(JSON.stringify(data, null, 2))
})

// Error events
socket.on('disconnect', (reason) => {
    console.log(`💔 Disconnected from server. Reason: ${reason}`)
})

socket.on('connect_error', (error) => {
    console.log(`❌ Connection error: ${error.message}`)
})

socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Reconnected after ${attemptNumber} attempts`)
})

socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Reconnection attempt ${attemptNumber}/5`)
})

socket.on('reconnect_error', (error) => {
    console.log(`❌ Reconnection error: ${error.message}`)
})

socket.on('reconnect_failed', () => {
    console.log('❌ Reconnection failed after maximum attempts')
    process.exit(1)
})

// Transport events
socket.io.on('upgrade', () => {
    console.log('🚀 Transport upgraded to: ' + socket.io.engine.transport.name)
})

socket.io.on('upgradeError', (error) => {
    console.log('❌ Transport upgrade error: ' + error.message)
})

// Test timeout scenario
setTimeout(() => {
    if (socket.connected) {
        console.log('✅ Connection stable after 30 seconds')
        console.log('🧪 Testing forced reconnection...')
        socket.io.engine.close()
    } else {
        console.log('❌ Connection failed - not connected after 30 seconds')
        process.exit(1)
    }
}, 30000)

// Keep alive and test periodic pings
setInterval(() => {
    if (socket.connected) {
        console.log('🔄 Sending periodic ping...')
        socket.emit('ping')
    }
}, 15000)

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down gracefully...')
    socket.disconnect()
    process.exit(0)
})

console.log('⏳ Waiting for connection...')

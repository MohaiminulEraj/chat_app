const io = require('socket.io-client')

// Test configuration
const SERVER_URL = 'ws://localhost:3001'
const TEST_USER_ID = 'test-user-123'
const TEST_ROOM_ID = 'test-room-456'

console.log('🚀 Testing new sendComment format...')
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
            roomID: TEST_ROOM_ID
        })
    }, 1000)

    // Wait a bit then try to send comment with new format
    setTimeout(() => {
        console.log('\n💬 Testing NEW sendComment format...')
        const commentData = {
            room: TEST_ROOM_ID,
            content: 'Hello, this is a test comment with the new format!',
            sender: TEST_USER_ID
        }
        console.log('   📤 Sending:', JSON.stringify(commentData, null, 2))
        socket.emit('sendComment', commentData)
    }, 3000)

    // Test with optional fields
    setTimeout(() => {
        console.log('\n💬 Testing sendComment with optional fields...')
        const commentData = {
            room: TEST_ROOM_ID,
            content: 'This comment has optional fields!',
            sender: TEST_USER_ID,
            messageType: 'text',
            metadata: { importance: 'high' }
        }
        console.log('   📤 Sending:', JSON.stringify(commentData, null, 2))
        socket.emit('sendComment', commentData)
    }, 5000)
})

// Listen for comment responses
socket.on('sendCommentResponse', (data) => {
    console.log('\n📥 SEND COMMENT RESPONSE:')
    console.log('   Status:', data.status)
    console.log('   Data:', JSON.stringify(data, null, 2))
})

socket.on('commentAdded', (data) => {
    console.log('\n📥 COMMENT ADDED:')
    console.log('   Data:', JSON.stringify(data, null, 2))
})

socket.on('commentActivityUpdate', (data) => {
    console.log('\n📊 COMMENT ACTIVITY UPDATE:')
    console.log('   Action:', data.action)
    console.log('   Comment ID:', data.commentId)
    console.log('   Added by:', data.addedByName)
})

// Listen for any errors
socket.on('error', (error) => {
    console.log('\n❌ SOCKET ERROR:')
    console.log('   Error:', JSON.stringify(error, null, 2))
})

socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message)
})

socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason)
})

// Keep alive for 15 seconds
setTimeout(() => {
    console.log('\n🔚 Test completed')
    socket.disconnect()
    process.exit(0)
}, 15000)

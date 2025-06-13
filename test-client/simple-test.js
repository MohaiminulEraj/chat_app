const io = require('socket.io-client')

console.log('Attempting to connect to chat namespace...')

const socket = io('http://localhost:3000/chat', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
})

socket.on('connect', () => {
    console.log('Connected!', socket.id)
})

socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message)
    console.error('Error type:', error.type)
    console.error('Error stack:', error.stack)
})

socket.on('error', (error) => {
    console.error('Socket error:', error)
})

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason)
})

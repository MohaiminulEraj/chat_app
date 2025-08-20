#!/usr/bin/env node

/**
 * Toggle Seat Lock WebSocket Test Client
 * Tests the toggleSeatLock socket event functionality
 */

const io = require('socket.io-client')

// Configuration
const SERVER_URL = 'http://localhost:3000'
const ROOM_ID = 'your-room-id-here'
const HOST_USER_ID = 'your-host-user-id-here'
const JWT_TOKEN = 'your-jwt-token-here'

class SeatLockTester {
    constructor() {
        this.socket = null
        this.testResults = []
    }

    connect() {
        return new Promise((resolve, reject) => {
            console.log('🔌 Connecting to server...')

            this.socket = io(SERVER_URL)

            this.socket.on('connect', () => {
                console.log('✅ Connected to server')
                this.setupListeners()
                resolve()
            })

            this.socket.on('connect_error', (error) => {
                console.error('❌ Connection error:', error)
                reject(error)
            })
        })
    }

    setupListeners() {
        // Response from toggleSeatLock
        this.socket.on('toggleSeatLockResponse', (response) => {
            console.log(
                '📥 Toggle Seat Lock Response:',
                JSON.stringify(response, null, 2)
            )
            this.testResults.push({
                event: 'toggleSeatLockResponse',
                data: response,
                timestamp: new Date().toISOString()
            })
        })

        // Broadcast when seat lock changes
        this.socket.on('seatLockChanged', (data) => {
            console.log('📢 Seat Lock Changed:', JSON.stringify(data, null, 2))
            this.testResults.push({
                event: 'seatLockChanged',
                data: data,
                timestamp: new Date().toISOString()
            })
        })

        // Room seats update
        this.socket.on('roomSeatsUpdate', (data) => {
            console.log('🪑 Room Seats Update:', JSON.stringify(data, null, 2))
            this.testResults.push({
                event: 'roomSeatsUpdate',
                data: data,
                timestamp: new Date().toISOString()
            })
        })

        // Join room response
        this.socket.on('joinRoomResponse', (response) => {
            console.log(
                '🏠 Join Room Response:',
                JSON.stringify(response, null, 2)
            )
        })

        // Sit in seat response
        this.socket.on('sitInSeatResponse', (response) => {
            console.log(
                '🪑 Sit In Seat Response:',
                JSON.stringify(response, null, 2)
            )
        })

        // Error events
        this.socket.on('error', (error) => {
            console.error('❌ Socket Error:', error)
        })
    }

    async authenticate() {
        return new Promise((resolve) => {
            console.log('🔐 Authenticating...')

            this.socket.emit('setup', {
                userId: HOST_USER_ID,
                token: JWT_TOKEN
            })

            // Wait a moment for authentication
            setTimeout(resolve, 1000)
        })
    }

    async joinRoom() {
        return new Promise((resolve) => {
            console.log('🏠 Joining room...')

            this.socket.emit('joinRoom', {
                roomId: ROOM_ID
            })

            // Wait a moment for room join
            setTimeout(resolve, 1000)
        })
    }

    async testLockEmptySeat() {
        console.log('\n🧪 Test 1: Lock empty seat (index 2)')

        return new Promise((resolve) => {
            this.socket.emit('toggleSeatLock', {
                roomId: ROOM_ID,
                seatIndex: 2,
                isLocked: true
            })

            setTimeout(resolve, 2000)
        })
    }

    async testUnlockSeat() {
        console.log('\n🧪 Test 2: Unlock seat (index 2)')

        return new Promise((resolve) => {
            this.socket.emit('toggleSeatLock', {
                roomId: ROOM_ID,
                seatIndex: 2,
                isLocked: false
            })

            setTimeout(resolve, 2000)
        })
    }

    async testLockOccupiedSeat() {
        console.log(
            '\n🧪 Test 3: Lock occupied seat (first sit in seat 3, then lock it)'
        )

        // First sit in seat 3
        this.socket.emit('sitInSeat', {
            roomId: ROOM_ID,
            seatIndex: 3
        })

        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Then try to lock that seat
        return new Promise((resolve) => {
            this.socket.emit('toggleSeatLock', {
                roomId: ROOM_ID,
                seatIndex: 3,
                isLocked: true
            })

            setTimeout(resolve, 2000)
        })
    }

    async testSitInLockedSeat() {
        console.log('\n🧪 Test 4: Try to sit in locked seat (should fail)')

        // First ensure seat 4 is locked
        this.socket.emit('toggleSeatLock', {
            roomId: ROOM_ID,
            seatIndex: 4,
            isLocked: true
        })

        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Then try to sit in that locked seat
        return new Promise((resolve) => {
            this.socket.emit('sitInSeat', {
                roomId: ROOM_ID,
                seatIndex: 4
            })

            setTimeout(resolve, 2000)
        })
    }

    async testInvalidSeatIndex() {
        console.log('\n🧪 Test 5: Try to lock invalid seat index (should fail)')

        return new Promise((resolve) => {
            this.socket.emit('toggleSeatLock', {
                roomId: ROOM_ID,
                seatIndex: 999, // Invalid seat index
                isLocked: true
            })

            setTimeout(resolve, 2000)
        })
    }

    async getRoomSeats() {
        console.log('\n🪑 Getting current room seats...')

        return new Promise((resolve) => {
            this.socket.emit('getRoomSeats', {
                roomId: ROOM_ID
            })

            this.socket.on('getRoomSeatsResponse', (response) => {
                console.log(
                    '🪑 Current Room Seats:',
                    JSON.stringify(response, null, 2)
                )
            })

            setTimeout(resolve, 1000)
        })
    }

    async runAllTests() {
        try {
            console.log('🚀 Starting Toggle Seat Lock Tests...\n')

            await this.connect()
            await this.authenticate()
            await this.joinRoom()

            // Get initial seat state
            await this.getRoomSeats()

            // Run tests
            await this.testLockEmptySeat()
            await this.testUnlockSeat()
            await this.testLockOccupiedSeat()
            await this.testSitInLockedSeat()
            await this.testInvalidSeatIndex()

            // Get final seat state
            await this.getRoomSeats()

            console.log('\n✅ All tests completed!')
            console.log('\n📊 Test Results Summary:')
            console.log(`Total events received: ${this.testResults.length}`)

            const eventCounts = this.testResults.reduce((acc, result) => {
                acc[result.event] = (acc[result.event] || 0) + 1
                return acc
            }, {})

            Object.entries(eventCounts).forEach(([event, count]) => {
                console.log(`  - ${event}: ${count}`)
            })
        } catch (error) {
            console.error('❌ Test failed:', error)
        } finally {
            this.socket.disconnect()
            process.exit(0)
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect()
        }
    }
}

// Usage instructions
if (require.main === module) {
    console.log('🧪 Toggle Seat Lock WebSocket Test Client\n')

    if (
        ROOM_ID === 'your-room-id-here' ||
        HOST_USER_ID === 'your-host-user-id-here' ||
        JWT_TOKEN === 'your-jwt-token-here'
    ) {
        console.log(
            '❌ Please update the configuration variables at the top of this file:'
        )
        console.log('- ROOM_ID: Your actual room UUID')
        console.log('- HOST_USER_ID: Your host user UUID')
        console.log('- JWT_TOKEN: Valid JWT token for authentication')
        console.log('- SERVER_URL: Update if using different host/port\n')
        process.exit(1)
    }

    const tester = new SeatLockTester()
    tester.runAllTests()
}

module.exports = SeatLockTester

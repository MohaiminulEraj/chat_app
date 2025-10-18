/**
 * Test Room Rankings - Flutter Integration Test
 *
 * This script tests the room ranking system to ensure it works correctly
 * with the Flutter client expectations.
 */

const io = require('socket.io-client')

// Configuration
const SERVER_URL = 'http://localhost:3000' // Change to your server URL
const TOKEN = 'YOUR_JWT_TOKEN_HERE' // Replace with a valid JWT token
const ROOM_ID = 'YOUR_ROOM_ID_HERE' // Replace with a valid room ID
const USER_ID = 'YOUR_USER_ID_HERE' // Replace with a valid user ID

// Create socket connection
const socket = io(SERVER_URL, {
    auth: {
        token: TOKEN
    },
    transports: ['websocket']
})

// Test results
const testResults = {
    subscribeToRankings: false,
    getRoomRankings_hourly: false,
    getRoomRankings_weekly: false,
    getRoomRankings_total: false,
    getRoomRankings_online: false,
    getHighestGiftSender: false
}

// Connection event
socket.on('connect', () => {
    console.log('✅ Connected to server')
    console.log('Socket ID:', socket.id)
    console.log('\n🧪 Starting Room Rankings Tests...\n')

    // Start tests
    runTests()
})

// Connection error
socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message)
})

// Disconnect event
socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server')
})

// Listen for ranking responses
socket.on('roomRankingsResponse', (data) => {
    console.log(`\n📊 Received roomRankingsResponse for period: ${data.period}`)
    console.log(`   Status: ${data.status}`)
    console.log(`   Total Rankings: ${data.totalCount}`)
    console.log(`   Rankings Count: ${data.rankings?.length || 0}`)

    if (data.rankings && data.rankings.length > 0) {
        console.log(
            `   Top Ranked User: ${data.rankings[0].userName} (Score: ${data.rankings[0].totalScore})`
        )
    } else {
        console.log(
            `   ⚠️  No rankings data (this is OK if no users are online/active)`
        )
    }

    // Validate response structure
    if (
        data.period &&
        data.rankings !== undefined &&
        data.totalCount !== undefined
    ) {
        testResults[`getRoomRankings_${data.period}`] = true
        console.log(`   ✅ Test passed for ${data.period} rankings`)
    } else {
        console.log(`   ❌ Test failed - Missing required fields`)
    }
})

socket.on('rankingsSubscription:success', (data) => {
    console.log('\n✅ Successfully subscribed to rankings')
    console.log(`   Room ID: ${data.roomId}`)
    console.log(`   Periods: ${data.periods.join(', ')}`)
    testResults.subscribeToRankings = true
})

socket.on('rankingsSubscription:error', (data) => {
    console.log('\n❌ Failed to subscribe to rankings')
    console.log(`   Error: ${data.error}`)
})

socket.on('highestGiftSender:response', (data) => {
    console.log('\n🎁 Received highestGiftSender response')
    console.log(`   Success: ${data.success}`)

    if (data.success && data.data) {
        console.log(`   Receiver: ${data.data.receiverName}`)
        if (data.data.highestSender) {
            console.log(
                `   Highest Sender: ${data.data.highestSender.userName}`
            )
            console.log(
                `   Total Value: ${data.data.highestSender.totalGiftValue}`
            )
            console.log(`   Gift Count: ${data.data.highestSender.giftCount}`)
        } else {
            console.log(`   No gift senders found`)
        }
        testResults.getHighestGiftSender = true
        console.log(`   ✅ Test passed for highest gift sender`)
    } else {
        console.log(`   ❌ Test failed`)
    }
})

socket.on('highestGiftSender:error', (data) => {
    console.log('\n❌ highestGiftSender error')
    console.log(`   Error: ${data.error}`)
})

// Run all tests
function runTests() {
    console.log('🔍 Test 1: Subscribe to Rankings')
    socket.emit('subscribeToRankings', {
        roomId: ROOM_ID,
        periods: ['hourly', 'weekly', 'total', 'online']
    })

    setTimeout(() => {
        console.log('\n🔍 Test 2: Get Hourly Rankings (limit as string)')
        socket.emit('getRoomRankings', {
            roomId: ROOM_ID,
            period: 'hourly',
            limit: '50' // Flutter sends as string
        })
    }, 1000)

    setTimeout(() => {
        console.log('\n🔍 Test 3: Get Weekly Rankings (limit as string)')
        socket.emit('getRoomRankings', {
            roomId: ROOM_ID,
            period: 'weekly',
            limit: '50'
        })
    }, 2000)

    setTimeout(() => {
        console.log('\n🔍 Test 4: Get Total Rankings (limit as string)')
        socket.emit('getRoomRankings', {
            roomId: ROOM_ID,
            period: 'total',
            limit: '50'
        })
    }, 3000)

    setTimeout(() => {
        console.log('\n🔍 Test 5: Get Online Rankings (limit as string)')
        console.log(
            '   🎯 This should show ALL online users, even with 0 gifts'
        )
        socket.emit('getRoomRankings', {
            roomId: ROOM_ID,
            period: 'online',
            limit: '50'
        })
    }, 4000)

    setTimeout(() => {
        console.log('\n🔍 Test 6: Get Highest Gift Sender (period: all)')
        socket.emit('getHighestGiftSender', {
            roomId: ROOM_ID,
            receiverId: USER_ID,
            period: 'all' // Flutter sends 'all'
        })
    }, 5000)

    // Print test summary after all tests
    setTimeout(() => {
        printTestSummary()
    }, 7000)
}

function printTestSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('📋 TEST SUMMARY')
    console.log('='.repeat(60))

    let passedTests = 0
    let totalTests = 0

    for (const [testName, passed] of Object.entries(testResults)) {
        totalTests++
        if (passed) {
            passedTests++
            console.log(`✅ ${testName}`)
        } else {
            console.log(`❌ ${testName}`)
        }
    }

    console.log('='.repeat(60))
    console.log(`Results: ${passedTests}/${totalTests} tests passed`)

    if (passedTests === totalTests) {
        console.log(
            '🎉 All tests passed! Flutter integration is working correctly.'
        )
    } else {
        console.log('⚠️  Some tests failed. Please check the errors above.')
    }
    console.log('='.repeat(60))

    // Disconnect after summary
    setTimeout(() => {
        socket.disconnect()
        process.exit(passedTests === totalTests ? 0 : 1)
    }, 1000)
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\n🛑 Tests interrupted by user')
    socket.disconnect()
    process.exit(1)
})

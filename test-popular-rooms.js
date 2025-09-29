// Test script to verify popular rooms functionality
// Run this after starting the server to test the API endpoints

const API_BASE_URL = 'http://localhost:3000/api/v1'

async function testPopularRoomsAPI() {
    console.log('🧪 Testing Popular Rooms API...\n')

    try {
        // Test 1: Get recommended rooms for comparison
        console.log('📋 Testing recommended rooms endpoint...')
        const recommendedResponse = await fetch(
            `${API_BASE_URL}/rooms/recommended`
        )
        const recommendedData = await recommendedResponse.json()

        if (recommendedResponse.ok) {
            console.log('✅ Recommended rooms API working')
            console.log(
                `   📊 Found ${recommendedData.data.length} recommended rooms`
            )
        } else {
            console.log(
                '❌ Recommended rooms API failed:',
                recommendedData.message
            )
        }

        console.log('\n' + '='.repeat(50) + '\n')

        // Test 2: Get popular rooms
        console.log('🔥 Testing popular rooms endpoint...')
        const popularResponse = await fetch(`${API_BASE_URL}/rooms/popular`)
        const popularData = await popularResponse.json()

        if (popularResponse.ok) {
            console.log('✅ Popular rooms API working')
            console.log(`   📊 Found ${popularData.data.length} popular rooms`)

            // Check if rooms have popularity data
            const roomsWithPopularity = popularData.data.filter(
                (room) => room.popularity
            )
            console.log(
                `   🎯 ${roomsWithPopularity.length} rooms have popularity data`
            )

            if (roomsWithPopularity.length > 0) {
                const topRoom = roomsWithPopularity[0]
                console.log('\n   🏆 Top popular room:')
                console.log(`      Name: ${topRoom.name}`)
                console.log(
                    `      Total Visits: ${topRoom.popularity.totalVisits}`
                )
                console.log(
                    `      Unique Visitors: ${topRoom.popularity.uniqueVisitors}`
                )
                console.log(
                    `      Popularity Score: ${topRoom.popularity.popularityScore}`
                )
            }

            // Check response format consistency
            const hasRequiredFields = popularData.data.every(
                (room) =>
                    room._id &&
                    room.name &&
                    room.roomOwner &&
                    room.members &&
                    Array.isArray(room.members)
            )

            if (hasRequiredFields) {
                console.log('✅ Response format matches recommended rooms API')
            } else {
                console.log('⚠️  Response format may need adjustment')
            }
        } else {
            console.log('❌ Popular rooms API failed:', popularData.message)
        }
    } catch (error) {
        console.error('❌ Test failed with error:', error.message)
        console.log(
            '\n💡 Make sure the server is running on http://localhost:3000'
        )
    }
}

// Add this to test room activity tracking
async function simulateRoomActivity() {
    console.log('\n🎮 Simulating room activity for testing...')

    // This would normally be done through actual user interactions
    // For testing purposes, you can manually call the trackRoomActivity method
    // or simulate users joining rooms through the WebSocket gateway

    console.log('💡 To test activity tracking:')
    console.log('   1. Use the WebSocket client to join rooms multiple times')
    console.log('   2. Check the room_activity_tracking table in the database')
    console.log('   3. Call the popular rooms API to see updated scores')
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testPopularRoomsAPI, simulateRoomActivity }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    testPopularRoomsAPI().then(() => {
        simulateRoomActivity()
    })
}

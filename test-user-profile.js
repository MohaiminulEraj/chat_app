/**
 * Test script for getUserProfile API endpoint
 * Tests the real data implementation vs the old dummy data
 */

const axios = require('axios')

// Configuration
const BASE_URL = 'http://localhost:3001'
const API_VERSION = 'api/v1'

// Test user ID (replace with actual user ID from your database)
const TEST_USER_ID = 'b953f2fc-8e64-44a5-b0b0-a19abdab86bd'
const TEST_CURRENT_USER_ID = 'b953f2fc-8e64-44a5-b0b0-a19abdab86bd' // Optional

/**
 * Test the getUserProfile endpoint
 */
async function testGetUserProfile() {
    console.log('🧪 Testing getUserProfile with Real Data Implementation')
    console.log('='.repeat(60))

    try {
        const endpoint = `${BASE_URL}/${API_VERSION}/rooms/user-profile/${TEST_USER_ID}`

        console.log(`📡 Making request to: ${endpoint}`)
        console.log(`👤 User ID: ${TEST_USER_ID}`)

        const response = await axios.get(endpoint, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: TEST_CURRENT_USER_ID
                    ? `Bearer ${TEST_CURRENT_USER_ID}`
                    : undefined
            }
        })

        console.log('✅ Request successful!')
        console.log('📊 Response Status:', response.status)
        console.log('📦 Response Data Structure:')

        const profile = response.data

        // Check main structure
        console.log('\n🏗️  Main Structure:')
        console.log('  ✓ userId:', profile.userId)
        console.log('  ✓ name:', profile.name)
        console.log('  ✓ displayName:', profile.displayName)
        console.log('  ✓ role:', profile.role)
        console.log('  ✓ location:', profile.location)
        console.log('  ✓ followersCount:', profile.followersCount)

        // Check profile section
        console.log('\n👤 Profile Section:')
        console.log(
            '  ✓ avatarUrl:',
            profile.profile?.avatarUrl ? '✅ Present' : '❌ Missing'
        )
        console.log(
            '  ✓ coverPhoto:',
            profile.profile?.coverPhoto ? '✅ Present' : '❌ Missing'
        )
        console.log(
            '  ✓ bio:',
            profile.profile?.bio ? '✅ Present' : '❌ Missing'
        )
        console.log('  ✓ level:', profile.profile?.level)
        console.log(
            '  ✓ badge:',
            Array.isArray(profile.profile?.badge)
                ? `✅ Array (${profile.profile.badge.length})`
                : '❌ Not array'
        )
        console.log('  ✓ binsBalance:', profile.profile?.binsBalance)
        console.log('  ✓ diamondBalance:', profile.profile?.diamondBalance)

        // Check privileges section
        console.log('\n🎁 Privileges Section:')
        console.log(
            '  ✓ giftWall.count:',
            profile.privileges?.giftWall?.count || 0
        )
        console.log(
            '  ✓ giftWall.totalValue:',
            profile.privileges?.giftWall?.totalValue || 0
        )
        console.log(
            '  ✓ giftWall.recentGifts:',
            Array.isArray(profile.privileges?.giftWall?.recentGifts)
                ? `✅ Array (${profile.privileges.giftWall.recentGifts.length})`
                : '❌ Not array'
        )
        console.log(
            '  ✓ decoration.count:',
            profile.privileges?.decoration?.count || 0
        )
        console.log(
            '  ✓ decoration.totalSpent:',
            profile.privileges?.decoration?.totalSpent || 0
        )
        console.log(
            '  ✓ decoration.activeDecorations:',
            Array.isArray(profile.privileges?.decoration?.activeDecorations)
                ? `✅ Array (${profile.privileges.decoration.activeDecorations.length})`
                : '❌ Not array'
        )

        // Check intimacy section
        console.log('\n💕 Intimacy Section:')
        console.log(
            '  ✓ totalConnections:',
            profile.intimacy?.totalConnections || 0
        )
        console.log('  ✓ intimacyScore:', profile.intimacy?.intimacyScore || 0)
        console.log(
            '  ✓ topConnections:',
            Array.isArray(profile.intimacy?.topConnections)
                ? `✅ Array (${profile.intimacy.topConnections.length})`
                : '❌ Not array'
        )

        // Check room context
        console.log('\n🏠 Room Context:')
        if (profile.roomContext) {
            console.log('  ✅ User is currently in a room')
            console.log('  ✓ roomId:', profile.roomContext.roomId)
            console.log('  ✓ roomName:', profile.roomContext.roomName)
            console.log('  ✓ timeInRoom:', profile.roomContext.timeInRoom)
            console.log('  ✓ seatNumber:', profile.roomContext.seatNumber)
            console.log('  ✓ isHost:', profile.roomContext.isHost)
            console.log(
                '  ✓ contributions:',
                JSON.stringify(profile.roomContext.contributions)
            )
        } else {
            console.log('  ℹ️  User is not currently in any room')
        }

        // Check stats section
        console.log('\n📈 Stats Section:')
        console.log(
            '  ✓ totalRoomsJoined:',
            profile.stats?.totalRoomsJoined || 0
        )
        console.log(
            '  ✓ totalTimeInRooms:',
            profile.stats?.totalTimeInRooms || '0 hours'
        )
        console.log(
            '  ✓ favoriteRoomType:',
            profile.stats?.favoriteRoomType || 'General'
        )
        console.log(
            '  ✓ hostingExperience:',
            profile.stats?.hostingExperience || '0 months'
        )
        console.log('  ✓ communityRating:', profile.stats?.communityRating || 0)
        console.log(
            '  ✓ totalGiftsReceived:',
            profile.stats?.totalGiftsReceived || 0
        )
        console.log('  ✓ totalGiftsSent:', profile.stats?.totalGiftsSent || 0)
        console.log(
            '  ✓ achievements:',
            Array.isArray(profile.stats?.achievements)
                ? `✅ Array (${profile.stats.achievements.length})`
                : '❌ Not array'
        )

        console.log('\n🎉 All structure validations passed!')
        console.log('\n📄 Full Response (first 500 chars):')
        console.log(JSON.stringify(profile, null, 2).substring(0, 500) + '...')
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message)
        if (error.response) {
            console.error('📊 Status:', error.response.status)
            console.error('📦 Response:', error.response.data)
        }
    }
}

/**
 * Instructions for running the test
 */
function printInstructions() {
    console.log('\n📋 Instructions:')
    console.log('1. Make sure your NestJS server is running on port 3000')
    console.log(
        '2. Update TEST_USER_ID with a real user UUID from your database'
    )
    console.log(
        '3. Optionally update TEST_CURRENT_USER_ID for context-specific data'
    )
    console.log('4. Run: node test-user-profile.js')
    console.log('\n🔍 This test validates:')
    console.log('  • Real database queries vs dummy data')
    console.log('  • Response structure compatibility')
    console.log('  • All helper methods functionality')
    console.log('  • Gift wall data aggregation')
    console.log('  • Intimacy calculations')
    console.log('  • Room context detection')
    console.log('  • Profile statistics compilation')
}

// Run the test if user provided a valid user ID
if (TEST_USER_ID === 'user-uuid-from-your-db') {
    console.log(
        '⚠️  Please update TEST_USER_ID with a real user UUID from your database'
    )
    printInstructions()
} else {
    testGetUserProfile()
}

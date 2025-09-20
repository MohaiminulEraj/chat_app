const axios = require('axios')

const BASE_URL = 'http://localhost:3001/api/v1'

// Test configuration
const testUser = {
    email: 'test@example.com',
    password: 'Test123!@#'
}

async function testGiftInitialization() {
    try {
        console.log('🔍 Testing Gift Initialization System...\n')

        // Step 1: Login to get token
        console.log('1. Logging in...')
        const loginResponse = await axios.post(
            `${BASE_URL}/auth/login`,
            testUser
        )

        if (!loginResponse.data.success) {
            console.log('Login failed, trying to register...')
            await axios.post(`${BASE_URL}/auth/register`, {
                ...testUser,
                username: 'testuser',
                fullName: 'Test User'
            })
            const loginRetry = await axios.post(
                `${BASE_URL}/auth/login`,
                testUser
            )
            if (!loginRetry.data.success) {
                throw new Error('Could not authenticate')
            }
        }

        const token = loginResponse.data.data.accessToken
        const headers = { Authorization: `Bearer ${token}` }

        console.log('✅ Authenticated successfully\n')

        // Step 2: Check current gift categories
        console.log('2. Checking current gift categories...')
        try {
            const categoriesResponse = await axios.get(
                `${BASE_URL}/gifts/categories`,
                { headers }
            )
            const data = categoriesResponse.data.data

            console.log(`📊 Current State:`)
            console.log(`   - Categories: ${data.summary.totalCategories}`)
            console.log(`   - Total Gifts: ${data.summary.totalGifts}`)
            console.log(
                `   - Currency Types: ${data.summary.currencyTypes.join(', ')}`
            )

            // Show gifts by category
            Object.keys(data.gifts).forEach((category) => {
                console.log(
                    `   - ${category.toUpperCase()}: ${data.gifts[category].length} gifts`
                )
            })
        } catch (error) {
            console.log('❌ No categories found or error occurred')
        }

        console.log('\n3. Running initialization...')
        const initResponse = await axios.post(
            `${BASE_URL}/gifts/initialize-data`,
            {},
            { headers }
        )

        console.log('🎯 Initialization Response:')
        console.log(JSON.stringify(initResponse.data, null, 2))

        // Step 4: Check categories again after initialization
        console.log('\n4. Checking gift categories after initialization...')
        const finalCategoriesResponse = await axios.get(
            `${BASE_URL}/gifts/categories`,
            { headers }
        )
        const finalData = finalCategoriesResponse.data.data

        console.log(`📊 Final State:`)
        console.log(`   - Categories: ${finalData.summary.totalCategories}`)
        console.log(`   - Total Gifts: ${finalData.summary.totalGifts}`)
        console.log(
            `   - Currency Types: ${finalData.summary.currencyTypes.join(', ')}`
        )

        // Show gifts by category with details
        Object.keys(finalData.gifts).forEach((category) => {
            const gifts = finalData.gifts[category]
            console.log(
                `\n   📦 ${category.toUpperCase()} Category (${gifts.length} gifts):`
            )
            gifts.forEach((gift) => {
                console.log(
                    `      - ${gift.name}: ${gift.price.amount} ${gift.price.currency}`
                )
            })
        })
    } catch (error) {
        console.error('❌ Error:', error.message)
        if (error.response) {
            console.error('Response data:', error.response.data)
        }
    }
}

testGiftInitialization()

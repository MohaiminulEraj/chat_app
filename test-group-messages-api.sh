#!/bin/bash

# Test the group message history endpoint
echo "Testing group message history endpoint..."

# Replace with your actual values
GROUP_ID="a6572f00-f726-40c6-b988-0daeb89b6916"
BASE_URL="http://localhost:3000"
# Add your JWT token here
JWT_TOKEN="your-jwt-token-here"

echo "Testing endpoint: $BASE_URL/api/v1/group-chat/$GROUP_ID/messages"

# Test with default parameters
curl -X GET "$BASE_URL/api/v1/group-chat/$GROUP_ID/messages" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  | jq .

echo ""
echo "Testing with pagination parameters..."

# Test with specific pagination
curl -X GET "$BASE_URL/api/v1/group-chat/$GROUP_ID/messages?page=1&limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  | jq .

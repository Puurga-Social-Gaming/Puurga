#!/bin/bash

# Test script for friend request functionality
# Usage: ./test_friend_requests.sh <AUTH_TOKEN> <TARGET_USER_ID>

echo "========================================="
echo "Friend Request Functionality Test Script"
echo "========================================="
echo ""

# Check if required arguments are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <AUTH_TOKEN> <TARGET_USER_ID>"
    echo ""
    echo "Example:"
    echo "  $0 'your-jwt-token-here' 'target-user-uuid-here'"
    exit 1
fi

AUTH_TOKEN="$1"
TARGET_USER_ID="$2"
BASE_URL="http://localhost:3005/api"

echo "Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Target User: $TARGET_USER_ID"
echo ""

# Test 1: Check friend request status
echo "Test 1: Checking friend request status..."
echo "  GET $BASE_URL/friend-requests/status/$TARGET_USER_ID"
STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$BASE_URL/friend-requests/status/$TARGET_USER_ID")
HTTP_CODE=$(echo "$STATUS_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$STATUS_RESPONSE" | head -n-1)
echo "  HTTP Code: $HTTP_CODE"
echo "  Response: $RESPONSE_BODY"
echo ""

# Test 2: Send friend request
echo "Test 2: Sending friend request..."
echo "  POST $BASE_URL/friend-requests/send"
SEND_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"receiverId\":\"$TARGET_USER_ID\"}" \
  "$BASE_URL/friend-requests/send")
HTTP_CODE=$(echo "$SEND_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$SEND_RESPONSE" | head -n-1)
echo "  HTTP Code: $HTTP_CODE"
echo "  Response: $RESPONSE_BODY"
echo ""

# Extract request ID if available
REQUEST_ID=$(echo "$RESPONSE_BODY" | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$REQUEST_ID" ]; then
    echo "  ✅ Friend request created with ID: $REQUEST_ID"
    echo ""
    
    # Test 3: Check status again
    echo "Test 3: Re-checking friend request status..."
    echo "  GET $BASE_URL/friend-requests/status/$TARGET_USER_ID"
    STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      "$BASE_URL/friend-requests/status/$TARGET_USER_ID")
    HTTP_CODE=$(echo "$STATUS_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$STATUS_RESPONSE" | head -n-1)
    echo "  HTTP Code: $HTTP_CODE"
    echo "  Response: $RESPONSE_BODY"
    echo ""
else
    echo "  ⚠️  Could not extract request ID from response"
fi

echo "========================================="
echo "Test Complete!"
echo "========================================="
echo ""
echo "Next steps to test accept/reject:"
echo "1. Login as the target user"
echo "2. Check notifications to see the friend request"
echo "3. Use the request ID to test accept/reject endpoints:"
echo "   - Accept: POST $BASE_URL/friend-requests/[REQUEST_ID]/accept"
echo "   - Reject: POST $BASE_URL/friend-requests/[REQUEST_ID]/reject"

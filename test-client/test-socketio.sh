#!/bin/bash

# Socket.IO One-to-One Chat Testing Script
# Usage: ./test-socketio.sh [--setup] [--tokens] [--run]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_CLIENT_DIR="$SCRIPT_DIR"
SERVER_URL="${SERVER_URL:-http://localhost:3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if server is running
check_server() {
    log_info "Checking if server is running at $SERVER_URL..."
    
    if curl -s -f "$SERVER_URL/health" > /dev/null 2>&1 || \
       curl -s -f "$SERVER_URL" > /dev/null 2>&1; then
        log_success "Server is running at $SERVER_URL"
        return 0
    else
        log_error "Server is not responding at $SERVER_URL"
        log_info "Please start your server first:"
        log_info "  npm run start:dev"
        log_info "  or"
        log_info "  docker-compose up"
        return 1
    fi
}

# Function to install dependencies
setup_dependencies() {
    log_info "Setting up test client dependencies..."
    
    cd "$TEST_CLIENT_DIR"
    
    if [ ! -f "package.json" ]; then
        log_error "package.json not found in test-client directory"
        return 1
    fi
    
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        log_info "Installing npm dependencies..."
        npm install
        log_success "Dependencies installed successfully"
    else
        log_success "Dependencies already installed"
    fi
}

# Function to get JWT tokens for testing
get_test_tokens() {
    log_info "Attempting to get JWT tokens for testing..."
    
    # Test credentials (you may need to adjust these)
    TEST_EMAIL_1="${TEST_EMAIL_1:-test1@example.com}"
    TEST_PASSWORD_1="${TEST_PASSWORD_1:-password123}"
    TEST_EMAIL_2="${TEST_EMAIL_2:-test2@example.com}"
    TEST_PASSWORD_2="${TEST_PASSWORD_2:-password123}"
    
    log_info "Getting token for user 1: $TEST_EMAIL_1"
    USER1_RESPONSE=$(curl -s -X POST "$SERVER_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL_1\",\"password\":\"$TEST_PASSWORD_1\"}" \
        2>/dev/null) || {
        log_error "Failed to get token for user 1"
        log_info "Try manual login:"
        echo "curl -X POST $SERVER_URL/auth/login -H \"Content-Type: application/json\" -d '{\"email\":\"$TEST_EMAIL_1\",\"password\":\"$TEST_PASSWORD_1\"}'"
        return 1
    }
    
    log_info "Getting token for user 2: $TEST_EMAIL_2"
    USER2_RESPONSE=$(curl -s -X POST "$SERVER_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL_2\",\"password\":\"$TEST_PASSWORD_2\"}" \
        2>/dev/null) || {
        log_error "Failed to get token for user 2"
        log_info "Try manual login:"
        echo "curl -X POST $SERVER_URL/auth/login -H \"Content-Type: application/json\" -d '{\"email\":\"$TEST_EMAIL_2\",\"password\":\"$TEST_PASSWORD_2\"}'"
        return 1
    }
    
    # Extract tokens (assuming JSON response with accessToken field)
    USER1_TOKEN=$(echo "$USER1_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    USER2_TOKEN=$(echo "$USER2_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$USER1_TOKEN" ] || [ -z "$USER2_TOKEN" ]; then
        log_error "Failed to extract tokens from login responses"
        log_info "Response 1: $USER1_RESPONSE"
        log_info "Response 2: $USER2_RESPONSE"
        log_info "Please check your login endpoint and credentials"
        return 1
    fi
    
    # Export tokens as environment variables
    export USER1_JWT_TOKEN="$USER1_TOKEN"
    export USER2_JWT_TOKEN="$USER2_TOKEN"
    
    log_success "Successfully obtained JWT tokens"
    log_info "User 1 token: ${USER1_TOKEN:0:20}..."
    log_info "User 2 token: ${USER2_TOKEN:0:20}..."
    
    # Save tokens to a file for future use
    cat > "$TEST_CLIENT_DIR/.env.tokens" << EOF
# Auto-generated JWT tokens for testing
USER1_JWT_TOKEN="$USER1_TOKEN"
USER2_JWT_TOKEN="$USER2_TOKEN"
EOF
    
    log_info "Tokens saved to .env.tokens file"
}

# Function to load tokens from file
load_tokens() {
    if [ -f "$TEST_CLIENT_DIR/.env.tokens" ]; then
        log_info "Loading tokens from .env.tokens file..."
        source "$TEST_CLIENT_DIR/.env.tokens"
        
        if [ -n "$USER1_JWT_TOKEN" ] && [ -n "$USER2_JWT_TOKEN" ]; then
            log_success "Tokens loaded successfully"
            return 0
        fi
    fi
    
    return 1
}

# Function to run the tests
run_tests() {
    log_info "Running Socket.IO one-to-one chat tests..."
    
    cd "$TEST_CLIENT_DIR"
    
    # Check if tokens are available
    if [ -z "$USER1_JWT_TOKEN" ] || [ -z "$USER2_JWT_TOKEN" ]; then
        log_warning "JWT tokens not found in environment"
        
        if load_tokens; then
            log_success "Loaded tokens from file"
        else
            log_info "Attempting to get new tokens..."
            if ! get_test_tokens; then
                log_error "Cannot proceed without valid JWT tokens"
                log_info "Please provide tokens manually:"
                log_info "  export USER1_JWT_TOKEN=\"your-token-1\""
                log_info "  export USER2_JWT_TOKEN=\"your-token-2\""
                return 1
            fi
        fi
    fi
    
    log_info "Starting test execution..."
    echo "=========================================="
    
    # Run the Node.js test script
    node socketio-one-to-one-test.js
    
    local exit_code=$?
    
    echo "=========================================="
    
    if [ $exit_code -eq 0 ]; then
        log_success "All tests completed successfully!"
    else
        log_error "Tests failed with exit code $exit_code"
        return $exit_code
    fi
}

# Function to show usage
show_usage() {
    echo "Socket.IO One-to-One Chat Testing Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --setup     Install dependencies and setup test environment"
    echo "  --tokens    Get fresh JWT tokens for testing"
    echo "  --run       Run the Socket.IO tests"
    echo "  --all       Run setup, get tokens, and run tests (default)"
    echo "  --help      Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SERVER_URL           Server URL (default: http://localhost:3000)"
    echo "  TEST_EMAIL_1         Email for test user 1 (default: test1@example.com)"
    echo "  TEST_PASSWORD_1      Password for test user 1 (default: password123)"
    echo "  TEST_EMAIL_2         Email for test user 2 (default: test2@example.com)"
    echo "  TEST_PASSWORD_2      Password for test user 2 (default: password123)"
    echo "  USER1_JWT_TOKEN      JWT token for user 1 (if already available)"
    echo "  USER2_JWT_TOKEN      JWT token for user 2 (if already available)"
    echo ""
    echo "Examples:"
    echo "  $0                                      # Run all steps"
    echo "  $0 --setup                             # Only setup dependencies"
    echo "  $0 --tokens                            # Only get fresh tokens"
    echo "  $0 --run                               # Only run tests"
    echo "  SERVER_URL=http://localhost:4000 $0    # Use different server URL"
}

# Main execution
main() {
    case "${1:-}" in
        --setup)
            check_server && setup_dependencies
            ;;
        --tokens)
            check_server && get_test_tokens
            ;;
        --run)
            check_server && run_tests
            ;;
        --all|"")
            check_server && setup_dependencies && run_tests
            ;;
        --help|-h)
            show_usage
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"

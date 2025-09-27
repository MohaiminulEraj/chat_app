# Authentication Security and SMTP Connection Updates

## Overview

Enhanced authentication service security by removing sensitive data from responses and implementing proper SMTP connection management for email verification.

## Key Security Improvements

### 1. Password Protection

- **Never Exposed**: Password field is never included in any API response
- **Internal Use Only**: Password is only used for internal authentication checks
- **Separate Methods**: Created `getUserForResponse()` method that excludes sensitive data

### 2. Response Data Sanitization

#### Before (Security Risk)

```typescript
// Old getAUser - returned all fields including password
return await this.userRepository.findOne({
    select: {
        password: true // ❌ Password exposed in responses
        // ... other fields
    }
})
```

#### After (Secure)

```typescript
// New getUserForResponse - excludes sensitive data
return await this.userRepository.findOne({
    select: {
        // password: false, // ✅ Password never included
        id: true,
        uuid: true,
        email: true
        // ... only safe fields
    }
})
```

### 3. Method Separation

#### getAUser (Internal Use)

- **Purpose**: Internal authentication and validation
- **Includes**: All fields including password, verification codes, hashes
- **Usage**: Login validation, password checks, verification processes

#### getUserForResponse (API Responses)

- **Purpose**: Safe data for API responses
- **Excludes**: Password, verification codes, hashes, sensitive data
- **Usage**: Login responses, registration responses, user data endpoints

## SMTP Connection Management

### 1. Regenerate-Code Endpoint Updates

#### API Response Format

```json
{
    "status": 200,
    "message": "Verification code sent",
    "result": null
}
```

#### Connection Management

- **On-Demand**: SMTP connection established only when sending email
- **Auto-Close**: Connection automatically closed after email sent
- **Error Handling**: Connection closed even on errors

### 2. Email Service Updates

#### sendEmailVerificationCode Method

```typescript
async sendEmailVerificationCode(userObj: User, code: number) {
    // Email content preparation
    const msgData = { /* email data */ }

    // Uses sendEmailSafely which:
    // 1. Establishes SMTP connection
    // 2. Sends email
    // 3. Closes connection immediately
    return this.sendEmailSafely({ /* email options */ })
}
```

## Updated API Endpoints

### 1. POST /auth/regenerate-code

```json
// Request
{
    "email": "user@example.com"
}

// Response
{
    "status": 200,
    "message": "Verification code sent",
    "result": null
}
```

### 2. POST /auth/login

```json
// Response (password never included)
{
    "statusCode": 200,
    "message": "Login successful",
    "data": {
        "id": 1,
        "uuid": "...",
        "name": "User Name",
        "email": "user@example.com",
        "token": "jwt-token...",
        "userType": "user",
        "binsBalance": 100.5,
        "diamondBalance": 25.0
        // password field never present
    }
}
```

### 3. POST /auth/register

```json
// Response (password never included)
{
    "statusCode": 201,
    "message": "Registration successful",
    "data": {
        "id": 1,
        "uuid": "...",
        "name": "User Name",
        "email": "user@example.com",
        "token": "jwt-token...",
        "userType": "user",
        "binsBalance": 0,
        "diamondBalance": 0
        // password field never present
    }
}
```

## Method Usage Guide

### For Authentication Checks (Internal)

```typescript
// Use getAUser when you need password for validation
const user = await this.getAUser({ email: loginDto.emailOrPhone })
const isValid = this.jwtService.isPasswordValid(
    loginDto.password,
    user.password
)
```

### For API Responses (External)

```typescript
// Use getUserForResponse when returning data to client
const userForResponse = await this.getUserForResponse({ id: user.id })
return await this.unifiedAuthResponse(userForResponse)
```

## Security Benefits

### 1. Data Protection

- **Password Safety**: Passwords never leak in API responses
- **Sensitive Data**: Verification codes and hashes excluded from responses
- **Minimal Exposure**: Only necessary data included in responses

### 2. Performance Optimization

- **Reduced Payload**: Smaller response sizes without sensitive data
- **Connection Efficiency**: SMTP connections only when needed
- **Resource Management**: Proper connection cleanup prevents resource leaks

### 3. Mobile App Security

- **Token-Based**: Primary authentication via JWT tokens
- **Stateless**: No sensitive data cached in mobile app
- **Clean Responses**: Simple success/error messages for verification

## Updated Authentication Flow

### 1. Registration Flow

```
1. User submits registration data
2. Password hashed and stored (getAUser for internal check)
3. User data retrieved safely (getUserForResponse)
4. JWT token generated
5. Clean response sent (no password)
```

### 2. Login Flow

```
1. User submits credentials
2. User retrieved with password (getAUser for validation)
3. Password validated internally
4. User data retrieved safely (getUserForResponse)
5. JWT token generated
6. Clean response sent (no password)
```

### 3. Email Verification Flow

```
1. User requests verification code
2. SMTP connection established
3. Email sent with code
4. SMTP connection closed
5. Simple success response returned
```

## Error Handling

### SMTP Failures

- **Connection Issues**: Proper error messages without exposing credentials
- **Send Failures**: Connection cleanup even on errors
- **Timeout Handling**: Graceful handling of connection timeouts

### Authentication Failures

- **Invalid Credentials**: Generic error messages (no password hints)
- **Account Issues**: Clear messages without exposing internal state
- **Token Issues**: Proper JWT error handling

This implementation ensures that sensitive data never leaves the server while maintaining proper SMTP connection management and providing clear, secure API responses for mobile app integration.

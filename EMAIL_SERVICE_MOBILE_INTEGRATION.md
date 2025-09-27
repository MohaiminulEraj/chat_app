# Email Service Activation and Mobile App Integration

## Overview

Updated the email service to activate automatically for forget password functionality with proper connection management and mobile app-friendly email templates.

## Key Changes Made

### 1. Email Service Activation (`src/modules/email/services/email.service.ts`)

#### Constructor Updates

- **Always Active**: Email service now initializes automatically without requiring `ENABLE_EMAIL_SERVICE=true`
- **Connection Management**: Removed automatic connection verification to prevent frequent server calls
- **Logging**: Enhanced logging for better debugging and monitoring

#### Connection Management

- **On-Demand Connection**: SMTP connection is established only when sending emails
- **Auto-Disconnect**: Connection is automatically closed after each email send operation
- **Error Handling**: Proper error handling with connection cleanup on failures

```typescript
// Connection established only when needed
await this.transporter.verify()
// Email sent
const result = await this.transporter.sendMail(mailOptions)
// Connection immediately closed
this.transporter.close()
```

### 2. Forget Password Email Content

#### Updated Message Content

- **Mobile App Context**: References mobile app instead of web pages
- **Clear Instructions**: Step-by-step instructions for mobile app users
- **Security Emphasis**: Explicit 5-minute expiration notice
- **Visual Code Display**: Bold formatting for verification code

#### Email Template Data

```typescript
const msgData = {
    recipient: userObj.name || 'User',
    title: 'Password Reset Verification Code',
    message: 'Mobile app specific message...',
    redirectTo: null, // No redirect for mobile app
    btnTitle: null, // No button for mobile app
    code: code, // Verification code for display
    expiryTime: '5 minutes' // Expiry information
}
```

### 3. Email Verification Updates

#### Similar Mobile App Integration

- **Consistent Messaging**: Matches forget password style
- **5-minute Expiration**: Updated from 2 minutes to 5 minutes
- **Mobile App References**: All content tailored for mobile app users

### 4. Email Template Enhancements (`src/modules/email/templates/email-template.hbs`)

#### Conditional Verification Code Display

```handlebars
{{#if msgData.code}}
    <tr>
        <td style='padding: 20px 0;text-align:center' class='verificationCode'>
            <div
                style='background-color:#00d2f4;color:#ffffff;font-size:32px;font-weight:bold;padding:15px 25px;border-radius:8px;display:inline-block;letter-spacing:3px'
            >
                {{msgData.code}}
            </div>
            {{#if msgData.expiryTime}}
                <p style='color:#999;font-size:14px;margin-top:10px'>
                    Expires in
                    {{msgData.expiryTime}}
                </p>
            {{/if}}
        </td>
    </tr>
{{/if}}
```

#### Conditional Redirect Button

```handlebars
{{#if msgData.redirectTo}}
    <!-- Button only shows if redirectTo is provided -->
    <table><!-- Button HTML --></table>
{{/if}}
```

## API Behavior

### Forget Password Endpoint (`POST /auth/forget-password`)

#### Request

```json
{
    "email": "user@example.com"
}
```

#### Response

```json
{
    "status": 201,
    "message": "Code sent",
    "result": null
}
```

#### Email Sent

- **Subject**: "Password Reset Verification Code"
- **Content**: Mobile app instructions with highlighted verification code
- **Code Display**: Large, bold, centered verification code
- **Expiry Notice**: Clear 5-minute expiration warning

### Connection Flow

1. User calls forget-password API
2. Service establishes SMTP connection
3. Email sent with verification code
4. SMTP connection immediately closed
5. API returns success response

## Configuration Requirements

### Environment Variables

```env
# SMTP Configuration (Required)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_MAIL_FROM=noreply@yourapp.com

# No longer required
# ENABLE_EMAIL_SERVICE=true  # Service always enabled now
```

### Gmail App Password Setup

1. Enable 2-Step Verification in Gmail
2. Generate App Password in Security settings
3. Use app password as `SMTP_PASSWORD`

### Brevo/SendinBlue Setup

1. Get SMTP credentials from Brevo dashboard
2. Use API key as `SMTP_PASSWORD`

## Mobile App Integration Benefits

### 1. User Experience

- **Clear Instructions**: Users know to check mobile app, not web browser
- **Visual Code**: Large, readable verification code in email
- **No Confusion**: No redirect buttons or web links

### 2. Security

- **5-minute Expiry**: Reasonable time window for mobile users
- **Connection Management**: Reduced server load and security exposure
- **Immediate Disconnection**: No persistent connections

### 3. Performance

- **On-Demand**: Connections only when needed
- **Quick Cleanup**: Immediate disconnection after sending
- **Reduced Load**: No background connection verification

## Future App Store Integration

### Placeholder for App Links

The email template is ready for future app store links:

```typescript
// Future update when app is published
const msgData = {
    // ... other fields
    redirectTo: 'https://play.google.com/store/apps/details?id=your.app',
    btnTitle: 'Open App'
}
```

When the app is published, simply update the email service calls to include:

- App Store download links
- Deep linking to password reset screen
- App-specific branding and instructions

## Testing

### 1. SMTP Connection Test

```bash
# Test SMTP configuration (optional)
curl -X POST http://localhost:3000/auth/forget-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 2. Email Content Verification

- Check email for proper code display
- Verify 5-minute expiry notice
- Confirm mobile app references
- Ensure no redirect buttons appear

### 3. Connection Management

- Monitor logs for connection establishment/closure
- Verify no persistent connections remain
- Check for proper error handling

## Troubleshooting

### Common Issues

1. **SMTP Authentication**: Ensure correct credentials and app passwords
2. **Connection Timeout**: Check firewall and port accessibility
3. **Template Rendering**: Verify handlebars syntax and data structure

### Debug Logging

The service provides detailed logging:

- Connection establishment
- Email sending success/failure
- Connection closure
- Error details with configuration hints

This implementation ensures reliable, secure, and mobile app-friendly email functionality while maintaining optimal server performance through proper connection management.

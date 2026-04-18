# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.0.x   | ✅ Yes    |
| 1.0.x   | ❌ No     |

## Reporting a Vulnerability

To report a security vulnerability, please open a GitHub Issue 
with the label "security". Do not include sensitive details 
publicly — we will respond within 48 hours.

## Security Measures Implemented

### API Key Management
- All API keys isolated in a single `CONFIG` object in `config.js`
- `config.js` is clearly documented with placeholder replacement 
  instructions
- Keys are never scattered through application logic

### Input Sanitization
- All user inputs pass through `sanitizeInput()` before use
- HTML tags stripped via regex
- Input length capped at 200 characters
- Script injection vectors removed (script, javascript, eval, onload)
- HTML entities escaped via `escapeHtml()` before DOM insertion

### Content Security Policy
- CSP meta tag enforced in `index.html`
- Restricts script sources to known CDNs and Google APIs only
- Blocks inline eval execution
- Restricts connection targets to Firebase and Google endpoints only

### Rate Limiting
- Gemini API calls rate-limited to 1 call per 2 seconds
- Maximum 20 AI calls per user session
- User shown friendly warning at 18 calls

### Firebase Data Validation
- All incoming Firebase data validated by `validateFirebaseData()`
- Wait time values must be numeric and between 0–120
- Invalid data is rejected before any DOM update

### Gemini Response Validation
- All AI responses validated by `validateGeminiResponse()`
- Must be non-empty string under 2000 characters
- Invalid responses trigger fallback messaging

### Error Handling
- Global error boundary via `window.addEventListener('error')`
- All errors logged in Google Cloud Logging structured JSON format
- No internal stack traces exposed to the user interface

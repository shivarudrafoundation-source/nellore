# Authentication & Session Strategy

## 1. Admin Authentication (Password + TOTP)
- **Primary Credentials**: Email + Password (at least 12 characters, hashed using bcrypt).
- **Secondary Credentials**: Mandatory Google Authenticator Time-Based One-Time Password (TOTP).
- **Setup**: Seeder prints out the TOTP secret/URI in development environment variables/logs.
- **Session Tokens**: Handled as access/refresh cookie pairs (HTTPOnly, secure, SameSite).

## 2. Judge Credentials (Forced Reset)
- **Credential Storage**: Email + Password (bcrypt).
- **Forced Reset**: If `mustResetPassword = true` is set, the judge is blocked from accessing scoring features. Upon first login, they are directed to update their credentials (at least 12 characters) which updates the DB and toggles `mustResetPassword = false`.

## 3. Contestant Passwordless Login
- **Mobile OTP**: OTP generation is passwordless.
- **Hashing**: OTP values are hashed before storage to prevent leakage from logs/cache.
- **Expiry**: Generated OTPs are valid for exactly 5 minutes.
- **Rate Limiting**: Requests are restricted to a maximum of 5 OTP requests per mobile number per hour.

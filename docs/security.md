# Security Architecture

## 1. Dynamic DB-Verified Judge Assignments
JWT metadata coordinates are never trusted to authorize judge actions. Every scoring request triggers the `JudgeAssignmentGuard`, which reads the judge's active assignment (`assignedEventId`, `assignedCategoryId`, `assignedRoundId`) directly from the database and blocks the request if there is a mismatch.

## 2. Judge Blindness (Data Isolation)
Judges are legally blocked from seeing contestant personal information (names, emails, phones, DOB, locations, or custom details) or other judges' scores.
The API implements an explicit serialization wrapper that outputs only:
- `contestant_id`
- `eventId`
No personal data is sent to the client browser.

## 3. Contestant Ownership Isolation
Contestants can access only their own registration/profile. The contestant identity is derived directly from the active authenticated session cookie (`user.sub`), preventing ID-swapping URL attacks.

## 4. Score Lock Enforcement
Once a score record is locked (`locked = true`), the `ScoreLockGuard` blocks all edits or overwrites by judges. Only authorized Admin unlock operations are permitted, and all lock overrides generate audit logs.

## 5. Audit Logging
The `AuditService` logs important auth and security actions (`ADMIN_LOGIN`, `OTP_VERIFIED`, `PASSWORD_RESET`, `SCORE_SUBMITTED`, etc.) to the `AuditLog` table. Sensitive data fields (passwords, TOTP secret, and JWT tokens) are redacted using recursive sanitization logic before logging.

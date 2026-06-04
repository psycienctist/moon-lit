# Auth Testing Playbook

## MongoDB
- `db.users` has unique index on `email`
- bcrypt hash starts with `$2b$`
- TTL index on `password_reset_tokens.expires_at`

## API
```bash
curl -c c.txt -X POST $BACKEND/api/auth/register -H "Content-Type: application/json" \
  -d '{"email":"u@x.com","password":"pw1234","username":"uname"}'
curl -b c.txt $BACKEND/api/auth/me
curl -c c.txt -X POST $BACKEND/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@lunatick.app","password":"luna123"}'
```

## Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh

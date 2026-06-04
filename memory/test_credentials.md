# Lunatick Community — Test Credentials

## Admin
- Email: `admin@lunatick.app`
- Password: `luna123`
- Role: `admin`
- Username: `luna_admin`

## Test user (create via UI/API as needed)
- Suggested: `tester@lunatick.app` / `test123` / username `cosmic_tester`

## API base
- `${REACT_APP_BACKEND_URL}/api`
- Auth via httpOnly cookies + `Authorization: Bearer <token>` fallback. Login response returns `{ user, token }` and sets cookies.

## Endpoints (selected)
- POST /api/auth/register { email, password, username }
- POST /api/auth/login { email, password }
- POST /api/auth/logout
- GET  /api/auth/me
- POST /api/auth/refresh
- GET  /api/boards
- GET  /api/posts?board_slug=&before=&limit=
- POST /api/posts { title, content, board_slug? }
- GET  /api/posts/{id}
- DELETE /api/posts/{id}
- POST /api/posts/{id}/react { emoji }
- GET  /api/posts/{id}/comments
- POST /api/posts/{id}/comments { content }
- DELETE /api/comments/{id}
- GET  /api/chat/history
- WS   /api/ws/chat?token=<JWT>   (send `{type:"message", content:"…"}`)
- POST /api/reports { target_type, target_id, reason }
- PUT  /api/users/me { username?, bio?, avatar_url? }
- GET  /api/users/{username}
- POST/DELETE /api/users/{username}/block

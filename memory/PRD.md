# Lunatick Community — PRD

## Original problem statement
> For my moon bro app named Lunatick, build a community tab in which users may interact via a chatroom and messageboards.

## User choices (gathered)
- **Auth**: JWT-based custom auth (email + password)
- **Chatroom**: WebSocket-based realtime
- **Boards**: Both — single chronological feed AND multiple categorized boards
- **Extras**: Likes/reactions on posts, user profiles with avatars, report/block

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`), MongoDB via Motor, JWT (PyJWT) with httpOnly cookies + Bearer fallback, bcrypt password hashing, native WebSocket endpoint at `/api/ws/chat` (token via query param)
- **Frontend**: React 18 + React Router 6 + Tailwind CSS, Lucide icons, Orbitron/Inter fonts. Themed in the existing Lunatick cosmic aesthetic (deep black `#05070a`, purple `#bc8cff`/`#6e40c9`, blue `#58a6ff`)
- **DB**: `lunatick_community` MongoDB database, collections: `users`, `posts`, `comments`, `boards`, `chat_messages`, `reports`, `login_attempts`, `password_reset_tokens`
- **Original Streamlit app preserved** at `/app/lunatick_streamlit/`

## User personas
- **Lunar enthusiasts** sharing moon phases, rituals, sightings
- **Astrology fans** discussing transits, charts, signs
- **Casual cosmonauts** posting memes and reflections
- **Admins** moderating reports and content

## Core requirements (static)
1. JWT email/password auth with brute-force lockout
2. Real-time WebSocket chatroom with presence
3. Single feed of all posts (timeline view)
4. Multiple categorized boards: general, rituals, astrology, sightings, memes, intentions
5. Emoji reactions (🌕 🔥 ✨ 🌀 💀) on posts
6. Comments on posts
7. User profiles with avatars (URL or generated monogram)
8. Editable profile (username, bio, avatar)
9. Report system (posts/comments/chat/users)
10. Block system (per-user filtering of authors)
11. Admin role with delete privileges

## Implemented (2026-06-04)
- ✅ Auth: register/login/logout/me/refresh, httpOnly cookies, bcrypt, brute-force lockout (IP+email and email-only fallbacks for ingress resilience)
- ✅ Admin seeding (`admin@lunatick.app` / `luna123`)
- ✅ 6 seeded boards with icons + descriptions
- ✅ Post creation (feed and board-targeted), listing (with pagination support), single fetch, deletion (author/admin)
- ✅ Toggleable emoji reactions per post
- ✅ Comments: create, list, delete (author/admin)
- ✅ Reports: POST endpoint + admin list
- ✅ User profile GET + PUT (username uniqueness, bio, avatar URL)
- ✅ Block/unblock endpoints (filters posts feed)
- ✅ WebSocket chat: JWT auth, broadcast, presence list, ping/pong heartbeat, MongoDB persistence
- ✅ REST `/api/chat/history` for cold loads
- ✅ Frontend: Landing, Login, Register, Feed, Boards, BoardView, PostDetail, Chat, Profile, Settings, themed Header with user dropdown
- ✅ data-testids across all critical UI

## Test results
- Backend: 22/24 → 24/24 after HIGH priority brute-force fix
- Frontend: 100% of tested flows passing (registration → feed compose → reactions → comments → boards → live chat with presence)

## Backlog / Future
- P1: Image uploads (avatar + post images) — currently URL only
- P1: Email-driven password reset (token system exists, only console log)
- P2: Direct messages between users
- P2: Notifications (mentions, replies, reactions)
- P2: Pagination UI ("Load more") on Feed/Board views
- P2: Search across posts + users
- P2: Admin moderation dashboard (currently `GET /api/reports` only, no UI)
- P3: Markdown rendering in posts/comments
- P3: Link from Streamlit Lunatick app to community

## Credentials
See `/app/memory/test_credentials.md`

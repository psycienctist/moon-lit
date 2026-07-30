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
- ✅ User profile GET + PUT (username uniqueness, bio, avatar URL, birth_date)
- ✅ Block/unblock endpoints (filters posts feed)
- ✅ WebSocket chat: JWT auth, broadcast, presence list, ping/pong heartbeat, MongoDB persistence
- ✅ REST `/api/chat/history` for cold loads
- ✅ Frontend: Landing, Login, Register, Feed, Boards, BoardView, PostDetail, Chat, Profile, Settings, themed Header with user dropdown
- ✅ data-testids across all critical UI

## Implemented (2026-06-05) — Cosmic Card share
- ✅ Backend: `ephem`-powered natal chart computation (`GET /api/cosmic/me`, `POST /api/cosmic/share`)
- ✅ Posts can now have `kind="cosmic_card"` with embedded structured `cosmic_data`
- ✅ Frontend: `<CosmicCard>` renders a rich card with sun/moon signs, birth phase, full-moons-lived counter, current phase/glow/age, moon-vibe text, personal aspect guidance, and live next-full-moon countdown
- ✅ "Share my Cosmic Card" CTA on Feed, with modal preview + optional note + board target
- ✅ Birth date editable in Settings (unlocks natal half of the card)
- ✅ Auth model switched to Bearer-token-in-localStorage (platform edge proxy injects `ACAO: *` which precludes credentialed cookies cross-origin)

## Implemented (2026-06-05) — Trading Card system, Twin Moons, Lunar Brief
- ✅ Rarity tiers (Common/Uncommon/Rare/Legendary) on every Cosmic Card, computed from natal chart (Full/New Moon births, Sun-Moon conjunctions, mystic sign combos). Natal chart now samples at 12:00 UTC to reliably catch full/new moon calendar dates.
- ✅ Twin Moon / Twin Sun / Twin Soul detection between any two users, shown as a badge on the profile
- ✅ Card trading: "Send my card" on any profile → recipient sees an Inbox item with the sender's card → Accept trades both snapshots into each user's Collection AND makes them Cosmic Friends. Decline / Cancel supported. Blocks respected.
- ✅ New pages: `/trades` (Incoming/Outgoing tabs), `/collection` (deck grid), `/u/:username/collection` (view others' decks)
- ✅ New backend endpoints: POST/GET `/api/trades`, POST `/api/trades/{id}/accept|decline`, DELETE `/api/trades/{id}`, GET `/api/collection`, GET `/api/friends`, GET `/api/lunar-brief`
- ✅ Profile now shows: rarity, natal summary, Twin badge vs viewer, cards count, friends count + list, contextual action button by trade_state (`none | outgoing_pending | incoming_pending | friend`)
- ✅ Lunar Brief widget on Feed: Cosmic Kindred (avatars ranked Twin Soul > Twin Moon > Twin Sun) + top cosmic-card posts from same-sign authors
- ✅ Header navigation extended with Trades + Deck links, plus user-menu dropdown with My Profile / My Deck / Trades / Edit Profile / Log out

## Bug fixes (2026-06-05)
- ✅ Header dropdown menu items were unclickable — CSS `#root > * { z-index: 2 }` was giving `<main>` an equal stacking context that painted on top of the header. Scoped the rule to only `main`/`footer` and gave `header` `z-index: 50`. Verified 100% by testing agent (iteration 4).

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

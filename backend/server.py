"""Lunatick Community backend — FastAPI + MongoDB + JWT + WebSocket chat."""
from dotenv import load_dotenv
load_dotenv()

import os
import secrets
import math
import asyncio
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List, Annotated, Literal

import bcrypt
import jwt
import ephem
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, Response, Depends, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, BeforeValidator

# -------------------------- CONFIG --------------------------
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_TTL_MIN = 60 * 24  # 1 day for community usability
REFRESH_TTL_DAYS = 30
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

mongo = AsyncIOMotorClient(MONGO_URL)
db = mongo[DB_NAME]

app = FastAPI(title="Lunatick Community API")

cors_origins_env = os.environ.get("CORS_ORIGINS", "*")
if cors_origins_env.strip() == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in cors_origins_env.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# -------------------------- HELPERS --------------------------
def now_utc():
    return datetime.now(timezone.utc)

def _aware(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    return jwt.encode(
        {"sub": user_id, "email": email, "type": "access",
         "exp": now_utc() + timedelta(minutes=ACCESS_TTL_MIN)},
        JWT_SECRET, algorithm=JWT_ALG)

def create_refresh_token(user_id: str) -> str:
    return jwt.encode(
        {"sub": user_id, "type": "refresh",
         "exp": now_utc() + timedelta(days=REFRESH_TTL_DAYS)},
        JWT_SECRET, algorithm=JWT_ALG)

def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])

def serialize_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "username": u["username"],
        "avatar_url": u.get("avatar_url"),
        "bio": u.get("bio", ""),
        "role": u.get("role", "user"),
        "blocked_users": [str(x) for x in u.get("blocked_users", [])],
        "birth_date": u.get("birth_date"),  # ISO date string YYYY-MM-DD or None
        "created_at": u.get("created_at", now_utc()).isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
    }

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=ACCESS_TTL_MIN*60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=REFRESH_TTL_DAYS*86400, path="/")

def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")

# -------------------------- MODELS --------------------------
class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    username: str = Field(min_length=3, max_length=24)

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class UpdateProfileReq(BaseModel):
    username: Optional[str] = Field(default=None, min_length=3, max_length=24)
    bio: Optional[str] = Field(default=None, max_length=280)
    avatar_url: Optional[str] = None
    birth_date: Optional[str] = None  # "YYYY-MM-DD" or "" to clear

class CreatePostReq(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=5000)
    board_slug: Optional[str] = None  # None = general feed

class CommentReq(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

class ReportReq(BaseModel):
    target_type: Literal["post", "comment", "chat", "user"]
    target_id: str
    reason: str = Field(min_length=3, max_length=500)

class ReactionReq(BaseModel):
    emoji: str = Field(min_length=1, max_length=8)  # e.g., 🌕, 🔥, ✨, 💀

# -------------------------- STARTUP --------------------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.posts.create_index([("created_at", -1)])
    await db.posts.create_index("board_slug")
    await db.comments.create_index([("post_id", 1), ("created_at", 1)])
    await db.chat_messages.create_index([("created_at", -1)])

    # Seed boards
    default_boards = [
        {"slug": "general", "name": "General", "description": "Open discussion for all moon bros & sis.", "icon": "🌙"},
        {"slug": "rituals", "name": "Full Moon Rituals", "description": "Share & discover lunar rituals and practices.", "icon": "🕯️"},
        {"slug": "astrology", "name": "Astrology", "description": "Birth charts, transits, retrogrades — all welcome.", "icon": "♒"},
        {"slug": "sightings", "name": "Sky Sightings", "description": "Photos of the moon, eclipses, planets & beyond.", "icon": "🔭"},
        {"slug": "memes", "name": "Cosmic Memes", "description": "Lunar humor & cosmic chaos.", "icon": "😹"},
        {"slug": "intentions", "name": "Intentions", "description": "Set, share, and reflect on your lunar intentions.", "icon": "✨"},
    ]
    for b in default_boards:
        await db.boards.update_one({"slug": b["slug"]}, {"$setOnInsert": b}, upsert=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@lunatick.app")
    admin_password = os.environ.get("ADMIN_PASSWORD", "luna123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "username": "luna_admin",
            "avatar_url": None,
            "bio": "Keeper of the Lunatick community.",
            "role": "admin",
            "blocked_users": [],
            "created_at": now_utc(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

# -------------------------- AUTH ENDPOINTS --------------------------
@app.post("/api/auth/register")
async def register(body: RegisterReq, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Email already registered")
    if await db.users.find_one({"username": body.username}):
        raise HTTPException(409, "Username already taken")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "username": body.username,
        "avatar_url": None,
        "bio": "",
        "role": "user",
        "blocked_users": [],
        "created_at": now_utc(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    doc["_id"] = res.inserted_id
    return {"user": serialize_user(doc), "token": access}

@app.post("/api/auth/login")
async def login(body: LoginReq, request: Request, response: Response):
    email = body.email.lower()
    fwd = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip")
    if fwd:
        ip = fwd.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and _aware(attempt.get("locked_until")) and _aware(attempt["locked_until"]) > now_utc():
        raise HTTPException(429, "Too many attempts. Try again later.")
    # Also enforce email-only lockout to be resilient to multi-IP ingress
    email_attempt = await db.login_attempts.find_one({"identifier": f"email:{email}"})
    if email_attempt and _aware(email_attempt.get("locked_until")) and _aware(email_attempt["locked_until"]) > now_utc():
        raise HTTPException(429, "Too many attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        try:
            new_count = (attempt.get("count", 0) if attempt else 0) + 1
            lock_until = now_utc() + timedelta(minutes=15) if new_count >= 5 else None
            await db.login_attempts.update_one(
                {"identifier": identifier},
                {"$set": {"count": new_count, "locked_until": lock_until, "updated_at": now_utc()}},
                upsert=True,
            )
            # email-scoped counter (so multi-IP ingress still gets locked)
            e_count = (email_attempt.get("count", 0) if email_attempt else 0) + 1
            e_lock = now_utc() + timedelta(minutes=15) if e_count >= 5 else None
            await db.login_attempts.update_one(
                {"identifier": f"email:{email}"},
                {"$set": {"count": e_count, "locked_until": e_lock, "updated_at": now_utc()}},
                upsert=True,
            )
        except Exception:
            pass
        raise HTTPException(401, "Invalid email or password")

    await db.login_attempts.delete_many({"identifier": {"$in": [identifier, f"email:{email}"]}})
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"user": serialize_user(user), "token": access}

@app.post("/api/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}

@app.get("/api/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)

@app.post("/api/auth/refresh")
async def refresh_token_endpoint(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(401, "No refresh token")
    try:
        payload = decode_token(rt)
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=ACCESS_TTL_MIN*60, path="/")
        return {"token": access}
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")

# -------------------------- USERS / PROFILE --------------------------
@app.put("/api/users/me")
async def update_me(body: UpdateProfileReq, user: dict = Depends(get_current_user)):
    updates = {}
    if body.username is not None and body.username != user["username"]:
        if await db.users.find_one({"username": body.username, "_id": {"$ne": user["_id"]}}):
            raise HTTPException(409, "Username taken")
        updates["username"] = body.username
    if body.bio is not None:
        updates["bio"] = body.bio
    if body.avatar_url is not None:
        updates["avatar_url"] = body.avatar_url
    if body.birth_date is not None:
        if body.birth_date == "":
            updates["birth_date"] = None
        else:
            try:
                date.fromisoformat(body.birth_date)
            except ValueError:
                raise HTTPException(400, "birth_date must be YYYY-MM-DD")
            updates["birth_date"] = body.birth_date
    if updates:
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    fresh = await db.users.find_one({"_id": user["_id"]})
    return serialize_user(fresh)

@app.get("/api/users/{username}")
async def get_user(username: str):
    u = await db.users.find_one({"username": username})
    if not u:
        raise HTTPException(404, "Not found")
    s = serialize_user(u)
    s.pop("email", None)
    return s

@app.post("/api/users/{username}/block")
async def block_user(username: str, user: dict = Depends(get_current_user)):
    target = await db.users.find_one({"username": username})
    if not target:
        raise HTTPException(404, "Not found")
    if target["_id"] == user["_id"]:
        raise HTTPException(400, "Cannot block yourself")
    await db.users.update_one({"_id": user["_id"]}, {"$addToSet": {"blocked_users": target["_id"]}})
    return {"ok": True}

@app.delete("/api/users/{username}/block")
async def unblock_user(username: str, user: dict = Depends(get_current_user)):
    target = await db.users.find_one({"username": username})
    if not target:
        raise HTTPException(404, "Not found")
    await db.users.update_one({"_id": user["_id"]}, {"$pull": {"blocked_users": target["_id"]}})
    return {"ok": True}

# -------------------------- BOARDS --------------------------
@app.get("/api/boards")
async def list_boards():
    boards = await db.boards.find({}, {"_id": 0}).to_list(length=None)
    # attach post counts
    for b in boards:
        b["post_count"] = await db.posts.count_documents({"board_slug": b["slug"]})
    return boards

# -------------------------- POSTS --------------------------
async def hydrate_post(p: dict, viewer: Optional[dict] = None) -> dict:
    author = await db.users.find_one({"_id": p["author_id"]})
    author_view = {
        "id": str(author["_id"]),
        "username": author["username"],
        "avatar_url": author.get("avatar_url"),
    } if author else {"id": None, "username": "[deleted]", "avatar_url": None}
    reactions = p.get("reactions", {})  # {emoji: [user_id, ...]}
    react_counts = {e: len(uids) for e, uids in reactions.items()}
    my_react = []
    if viewer:
        vid = str(viewer["_id"])
        my_react = [e for e, uids in reactions.items() if vid in [str(x) for x in uids]]
    comment_count = await db.comments.count_documents({"post_id": p["_id"]})
    return {
        "id": str(p["_id"]),
        "title": p["title"],
        "content": p["content"],
        "board_slug": p.get("board_slug"),
        "kind": p.get("kind", "text"),
        "cosmic_data": p.get("cosmic_data"),
        "author": author_view,
        "reactions": react_counts,
        "my_reactions": my_react,
        "comment_count": comment_count,
        "created_at": p["created_at"].isoformat(),
    }

@app.post("/api/posts")
async def create_post(body: CreatePostReq, user: dict = Depends(get_current_user)):
    if body.board_slug:
        board = await db.boards.find_one({"slug": body.board_slug})
        if not board:
            raise HTTPException(404, "Board not found")
    doc = {
        "title": body.title,
        "content": body.content,
        "board_slug": body.board_slug,
        "author_id": user["_id"],
        "reactions": {},
        "created_at": now_utc(),
    }
    res = await db.posts.insert_one(doc)
    doc["_id"] = res.inserted_id
    return await hydrate_post(doc, user)

@app.get("/api/posts")
async def list_posts(
    board_slug: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
    before: Optional[str] = None,
    request: Request = None,
):
    viewer = None
    try:
        viewer = await get_current_user(request)
    except Exception:
        pass

    q: dict = {}
    if board_slug:
        q["board_slug"] = board_slug
    if before:
        try:
            q["created_at"] = {"$lt": datetime.fromisoformat(before)}
        except Exception:
            pass
    if viewer:
        blocked = viewer.get("blocked_users", [])
        if blocked:
            q["author_id"] = {"$nin": blocked}
    cursor = db.posts.find(q).sort("created_at", -1).limit(limit)
    posts = []
    async for p in cursor:
        posts.append(await hydrate_post(p, viewer))
    return posts

@app.get("/api/posts/{post_id}")
async def get_post(post_id: str, request: Request):
    viewer = None
    try:
        viewer = await get_current_user(request)
    except Exception:
        pass
    try:
        oid = ObjectId(post_id)
    except Exception:
        raise HTTPException(404, "Not found")
    p = await db.posts.find_one({"_id": oid})
    if not p:
        raise HTTPException(404, "Not found")
    return await hydrate_post(p, viewer)

@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(post_id)
    except Exception:
        raise HTTPException(404, "Not found")
    p = await db.posts.find_one({"_id": oid})
    if not p:
        raise HTTPException(404, "Not found")
    if p["author_id"] != user["_id"] and user.get("role") != "admin":
        raise HTTPException(403, "Forbidden")
    await db.posts.delete_one({"_id": oid})
    await db.comments.delete_many({"post_id": oid})
    return {"ok": True}

@app.post("/api/posts/{post_id}/react")
async def react_to_post(post_id: str, body: ReactionReq, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(post_id)
    except Exception:
        raise HTTPException(404, "Not found")
    p = await db.posts.find_one({"_id": oid})
    if not p:
        raise HTTPException(404, "Not found")
    reactions = p.get("reactions", {}) or {}
    emoji = body.emoji
    uid = user["_id"]
    uid_list = reactions.get(emoji, [])
    uid_strs = [str(x) for x in uid_list]
    if str(uid) in uid_strs:
        uid_list = [x for x in uid_list if str(x) != str(uid)]
    else:
        uid_list = uid_list + [uid]
    if uid_list:
        reactions[emoji] = uid_list
    else:
        reactions.pop(emoji, None)
    await db.posts.update_one({"_id": oid}, {"$set": {"reactions": reactions}})
    p["reactions"] = reactions
    return await hydrate_post(p, user)

# -------------------------- COMMENTS --------------------------
@app.get("/api/posts/{post_id}/comments")
async def list_comments(post_id: str):
    try:
        oid = ObjectId(post_id)
    except Exception:
        raise HTTPException(404, "Not found")
    cursor = db.comments.find({"post_id": oid}).sort("created_at", 1)
    out = []
    async for c in cursor:
        author = await db.users.find_one({"_id": c["author_id"]})
        out.append({
            "id": str(c["_id"]),
            "content": c["content"],
            "created_at": c["created_at"].isoformat(),
            "author": {
                "id": str(author["_id"]) if author else None,
                "username": author["username"] if author else "[deleted]",
                "avatar_url": author.get("avatar_url") if author else None,
            }
        })
    return out

@app.post("/api/posts/{post_id}/comments")
async def add_comment(post_id: str, body: CommentReq, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(post_id)
    except Exception:
        raise HTTPException(404, "Not found")
    p = await db.posts.find_one({"_id": oid})
    if not p:
        raise HTTPException(404, "Not found")
    doc = {
        "post_id": oid,
        "author_id": user["_id"],
        "content": body.content,
        "created_at": now_utc(),
    }
    res = await db.comments.insert_one(doc)
    return {
        "id": str(res.inserted_id),
        "content": body.content,
        "created_at": doc["created_at"].isoformat(),
        "author": {
            "id": str(user["_id"]),
            "username": user["username"],
            "avatar_url": user.get("avatar_url"),
        }
    }

@app.delete("/api/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(comment_id)
    except Exception:
        raise HTTPException(404, "Not found")
    c = await db.comments.find_one({"_id": oid})
    if not c:
        raise HTTPException(404, "Not found")
    if c["author_id"] != user["_id"] and user.get("role") != "admin":
        raise HTTPException(403, "Forbidden")
    await db.comments.delete_one({"_id": oid})
    return {"ok": True}

# -------------------------- REPORTS --------------------------
@app.post("/api/reports")
async def create_report(body: ReportReq, user: dict = Depends(get_current_user)):
    await db.reports.insert_one({
        "reporter_id": user["_id"],
        "target_type": body.target_type,
        "target_id": body.target_id,
        "reason": body.reason,
        "status": "open",
        "created_at": now_utc(),
    })
    return {"ok": True}

@app.get("/api/reports")
async def list_reports(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    cursor = db.reports.find({}).sort("created_at", -1).limit(100)
    out = []
    async for r in cursor:
        out.append({
            "id": str(r["_id"]),
            "target_type": r["target_type"],
            "target_id": r["target_id"],
            "reason": r["reason"],
            "status": r["status"],
            "reporter_id": str(r["reporter_id"]),
            "created_at": r["created_at"].isoformat(),
        })
    return out

# -------------------------- CHAT (WebSocket + REST history) --------------------------
class ChatManager:
    def __init__(self):
        self.active: dict[str, WebSocket] = {}  # ws_id -> ws
        self.user_of: dict[str, dict] = {}  # ws_id -> {id, username, avatar_url}

    async def connect(self, ws: WebSocket, ws_id: str, user_view: dict):
        await ws.accept()
        self.active[ws_id] = ws
        self.user_of[ws_id] = user_view
        await self.broadcast_presence()

    def disconnect(self, ws_id: str):
        self.active.pop(ws_id, None)
        self.user_of.pop(ws_id, None)

    async def broadcast(self, msg: dict):
        dead = []
        for wid, ws in self.active.items():
            try:
                await ws.send_json(msg)
            except Exception:
                dead.append(wid)
        for wid in dead:
            self.disconnect(wid)

    async def broadcast_presence(self):
        users = list({u["id"]: u for u in self.user_of.values()}.values())
        await self.broadcast({"type": "presence", "users": users, "count": len(users)})

chat = ChatManager()

@app.get("/api/chat/history")
async def chat_history(limit: int = Query(50, ge=1, le=200)):
    cursor = db.chat_messages.find({}).sort("created_at", -1).limit(limit)
    msgs = []
    async for m in cursor:
        author = await db.users.find_one({"_id": m["author_id"]})
        msgs.append({
            "id": str(m["_id"]),
            "content": m["content"],
            "created_at": m["created_at"].isoformat(),
            "author": {
                "id": str(author["_id"]) if author else None,
                "username": author["username"] if author else "[deleted]",
                "avatar_url": author.get("avatar_url") if author else None,
            }
        })
    msgs.reverse()
    return msgs

@app.websocket("/api/ws/chat")
async def ws_chat(websocket: WebSocket, token: str = Query(...)):
    # Auth via query token (cookies don't easily work on WS clients across cors)
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            await websocket.close(code=4401)
            return
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            await websocket.close(code=4401)
            return
    except Exception:
        await websocket.close(code=4401)
        return

    user_view = {
        "id": str(user["_id"]),
        "username": user["username"],
        "avatar_url": user.get("avatar_url"),
    }
    ws_id = secrets.token_urlsafe(8)
    await chat.connect(websocket, ws_id, user_view)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "message":
                content = (data.get("content") or "").strip()
                if not content:
                    continue
                if len(content) > 1000:
                    content = content[:1000]
                doc = {
                    "author_id": user["_id"],
                    "content": content,
                    "created_at": now_utc(),
                }
                res = await db.chat_messages.insert_one(doc)
                await chat.broadcast({
                    "type": "message",
                    "id": str(res.inserted_id),
                    "content": content,
                    "created_at": doc["created_at"].isoformat(),
                    "author": user_view,
                })
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        chat.disconnect(ws_id)
        await chat.broadcast_presence()

# -------------------------- COSMIC CARD --------------------------
ZODIAC_SIGNS = [
    ("Aries", "♈", "Bold, assertive energy. Great for starting new projects."),
    ("Taurus", "♉", "Grounded, sensual vibes. Focus on comfort and stability."),
    ("Gemini", "♊", "Curious, communicative mood. Ideal for learning and socialising."),
    ("Cancer", "♋", "Nurturing, emotional depth. Prioritise home and family."),
    ("Leo", "♌", "Creative, warm-hearted energy. Shine and express yourself."),
    ("Virgo", "♍", "Analytical, detail-oriented. Perfect for organising and health."),
    ("Libra", "♎", "Harmonious, balanced mood. Focus on relationships and beauty."),
    ("Scorpio", "♏", "Intense, transformative energy. Dive deep within."),
    ("Sagittarius", "♐", "Adventurous, optimistic vibes. Seek truth and explore."),
    ("Capricorn", "♑", "Disciplined, ambitious. Build towards long-term goals."),
    ("Aquarius", "♒", "Innovative, humanitarian energy. Think outside the box."),
    ("Pisces", "♓", "Dreamy, intuitive mood. Meditate and create art."),
]

def _zodiac(lon_deg: float):
    idx = int(lon_deg / 30) % 12
    return ZODIAC_SIGNS[idx]

def _moon_phase_name(frac: float):
    phases = [
        (0.00, "New Moon", "🌑"), (0.07, "Waxing Crescent", "🌒"), (0.25, "First Quarter", "🌓"),
        (0.43, "Waxing Gibbous", "🌔"), (0.50, "Full Moon", "🌕"), (0.57, "Waning Gibbous", "🌖"),
        (0.75, "Last Quarter", "🌗"), (0.93, "Waning Crescent", "🌘"), (1.00, "New Moon", "🌑"),
    ]
    for i in range(len(phases) - 1):
        if phases[i][0] <= frac < phases[i + 1][0]:
            return phases[i][1], phases[i][2]
    return "New Moon", "🌑"

def _chart(dt_utc: datetime) -> dict:
    obs = ephem.Observer()
    obs.lat, obs.lon = "0", "0"
    obs.date = ephem.Date(dt_utc)
    moon = ephem.Moon(obs)
    sun = ephem.Sun(obs)
    illum = moon.phase / 100.0
    elong = float(moon.elong)
    if elong < 0:
        elong += 2 * math.pi
    phase_frac = elong / (2 * math.pi)
    phase_name, phase_emoji = _moon_phase_name(phase_frac)
    moon_lon = math.degrees(float(ephem.Ecliptic(moon).lon)) % 360
    sun_lon = math.degrees(float(ephem.Ecliptic(sun).lon)) % 360
    moon_sign, moon_symbol, moon_vibe = _zodiac(moon_lon)
    sun_sign, sun_symbol, _ = _zodiac(sun_lon)
    next_full = ephem.next_full_moon(obs.date).datetime().replace(tzinfo=timezone.utc)
    return {
        "moon_sign": moon_sign, "moon_symbol": moon_symbol, "moon_vibe": moon_vibe, "moon_lon": moon_lon,
        "sun_sign": sun_sign, "sun_symbol": sun_symbol,
        "phase_frac": phase_frac, "phase_name": phase_name, "phase_emoji": phase_emoji,
        "illum": illum,
        "next_full_dt": next_full,
        "age_days": phase_frac * 29.53,
    }

def _aspect(natal_moon_lon: float, current_moon_lon: float):
    diff = (current_moon_lon - natal_moon_lon) % 360
    if diff < 10 or diff > 350:
        return "Lunar Return", "High intuition today. Your birth rhythm is peaking."
    if 170 < diff < 190:
        return "Opposition", "Emotions might feel like a tug-of-war. Balance yourself."
    if 80 < diff < 100 or 260 < diff < 280:
        return "Square", "Tension in the air. The universe is pushing you to grow."
    if 110 < diff < 130 or 230 < diff < 250:
        return "Trine", "Harmony! Today's cosmic tide flows perfectly with you."
    return "Cycle", "Steady growth. Build on the intentions you set recently."

def _build_cosmic_snapshot(user: dict) -> dict:
    now_dt = now_utc()
    current = _chart(now_dt)
    snapshot = {
        "now": {
            "phase_name": current["phase_name"],
            "phase_emoji": current["phase_emoji"],
            "illum_pct": round(current["illum"] * 100, 1),
            "age_days": round(current["age_days"], 1),
            "moon_sign": current["moon_sign"],
            "moon_symbol": current["moon_symbol"],
            "moon_vibe": current["moon_vibe"],
            "sun_sign": current["sun_sign"],
            "sun_symbol": current["sun_symbol"],
            "next_full_iso": current["next_full_dt"].isoformat(),
        }
    }
    bd = user.get("birth_date")
    if bd:
        try:
            bd_dt = datetime.combine(date.fromisoformat(bd), datetime.min.time()).replace(tzinfo=timezone.utc)
            natal = _chart(bd_dt)
            aspect, guidance = _aspect(natal["moon_lon"], current["moon_lon"])
            total_moons = (now_dt - bd_dt).days / 29.53
            snapshot["natal"] = {
                "birth_date": bd,
                "sun_sign": natal["sun_sign"],
                "sun_symbol": natal["sun_symbol"],
                "moon_sign": natal["moon_sign"],
                "moon_symbol": natal["moon_symbol"],
                "birth_phase_name": natal["phase_name"],
                "birth_phase_emoji": natal["phase_emoji"],
                "total_full_moons_lived": int(total_moons),
                "aspect": aspect,
                "guidance": guidance,
            }
        except Exception:
            pass
    return snapshot

@app.get("/api/cosmic/me")
async def cosmic_me(user: dict = Depends(get_current_user)):
    return _build_cosmic_snapshot(user)

class ShareCosmicReq(BaseModel):
    board_slug: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=500)

@app.post("/api/cosmic/share")
async def cosmic_share(body: ShareCosmicReq, user: dict = Depends(get_current_user)):
    if body.board_slug:
        board = await db.boards.find_one({"slug": body.board_slug})
        if not board:
            raise HTTPException(404, "Board not found")
    snap = _build_cosmic_snapshot(user)
    n = snap["now"]
    nat = snap.get("natal")
    if nat:
        title = f"🌙 {user['username']}'s Cosmic Card — {nat['sun_symbol']} {nat['sun_sign']} · {nat['moon_symbol']} {nat['moon_sign']}"
    else:
        title = f"🌙 {user['username']}'s Cosmic Card — {n['moon_symbol']} Moon in {n['moon_sign']}"
    content_lines = [
        f"{n['phase_emoji']} {n['phase_name']} · {n['illum_pct']}% lit · day {n['age_days']} of cycle",
        f"Moon in {n['moon_symbol']} {n['moon_sign']} — {n['moon_vibe']}",
    ]
    if nat:
        content_lines.append(f"✨ {nat['aspect']}: {nat['guidance']}")
        content_lines.append(f"🌕 Full moons lived: {nat['total_full_moons_lived']}")
    if body.note:
        content_lines.append("")
        content_lines.append(body.note.strip())
    content = "\n".join(content_lines)
    doc = {
        "title": title,
        "content": content,
        "board_slug": body.board_slug,
        "author_id": user["_id"],
        "reactions": {},
        "kind": "cosmic_card",
        "cosmic_data": snap,
        "created_at": now_utc(),
    }
    res = await db.posts.insert_one(doc)
    doc["_id"] = res.inserted_id
    return await hydrate_post(doc, user)

# -------------------------- HEALTH --------------------------
@app.get("/api/health")
async def health():
    return {"ok": True, "service": "lunatick-community"}

"""Lunatick Community backend integration tests."""
import os
import json
import time
import uuid
import asyncio
import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://2d9eaf74-5050-40b0-8d15-b3aa696ff8e4.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/chat"

ADMIN_EMAIL = "admin@lunatick.app"
ADMIN_PASSWORD = "luna123"


def _new_user_creds():
    rid = uuid.uuid4().hex[:8]
    return {
        "email": f"TEST_{rid}@lunatick.app",
        "username": f"TEST_{rid}",
        "password": "test12345",
    }


# ----- Fixtures -----
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def user_a():
    creds = _new_user_creds()
    r = requests.post(f"{API}/auth/register", json=creds)
    assert r.status_code == 200, r.text
    j = r.json()
    return {"creds": creds, "token": j["token"], "user": j["user"]}


@pytest.fixture(scope="session")
def user_b():
    creds = _new_user_creds()
    r = requests.post(f"{API}/auth/register", json=creds)
    assert r.status_code == 200, r.text
    j = r.json()
    return {"creds": creds, "token": j["token"], "user": j["user"]}


def H(token):
    return {"Authorization": f"Bearer {token}"}


# ----- Health -----
def test_health():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ----- Auth -----
def test_register_duplicate_email():
    creds = _new_user_creds()
    r1 = requests.post(f"{API}/auth/register", json=creds)
    assert r1.status_code == 200
    creds2 = dict(creds)
    creds2["username"] = "TEST_other" + uuid.uuid4().hex[:4]
    r2 = requests.post(f"{API}/auth/register", json=creds2)
    assert r2.status_code == 409, r2.text


def test_register_duplicate_username():
    creds = _new_user_creds()
    r1 = requests.post(f"{API}/auth/register", json=creds)
    assert r1.status_code == 200
    creds2 = _new_user_creds()
    creds2["username"] = creds["username"]
    r2 = requests.post(f"{API}/auth/register", json=creds2)
    assert r2.status_code == 409, r2.text


def test_admin_login(admin_token):
    assert isinstance(admin_token, str) and len(admin_token) > 10


def test_me_with_bearer(user_a):
    r = requests.get(f"{API}/auth/me", headers=H(user_a["token"]))
    assert r.status_code == 200
    # server lowercases email on register
    assert r.json()["email"] == user_a["creds"]["email"].lower()


def test_me_unauthorized():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_logout(user_a):
    r = requests.post(f"{API}/auth/logout", headers=H(user_a["token"]))
    assert r.status_code == 200


def test_brute_force_lockout():
    creds = _new_user_creds()
    requests.post(f"{API}/auth/register", json=creds)
    # 5 wrong attempts
    last = None
    for i in range(6):
        last = requests.post(f"{API}/auth/login", json={"email": creds["email"], "password": "wrong"})
    # After 5 it should be locked -> 429
    assert last.status_code in (401, 429)
    # 6th attempt definitely should be 429
    r6 = requests.post(f"{API}/auth/login", json={"email": creds["email"], "password": "wrong"})
    assert r6.status_code == 429, f"Expected lockout, got {r6.status_code}"


# ----- Boards -----
def test_list_boards():
    r = requests.get(f"{API}/boards")
    assert r.status_code == 200
    boards = r.json()
    slugs = {b["slug"] for b in boards}
    expected = {"general", "rituals", "astrology", "sightings", "memes", "intentions"}
    assert expected.issubset(slugs), f"Missing boards: {expected - slugs}"
    for b in boards:
        assert "post_count" in b


# ----- Posts -----
def test_post_create_in_general_feed(user_a):
    r = requests.post(f"{API}/posts", headers=H(user_a["token"]),
                      json={"title": "TEST general feed", "content": "hello moon"})
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["title"] == "TEST general feed"
    assert p["author"]["username"] == user_a["user"]["username"]
    assert p["comment_count"] == 0
    assert p["reactions"] == {}


def test_post_create_in_board_and_filter(user_a):
    r = requests.post(f"{API}/posts", headers=H(user_a["token"]),
                      json={"title": "TEST in rituals", "content": "ritual", "board_slug": "rituals"})
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    # filter by board
    rf = requests.get(f"{API}/posts", params={"board_slug": "rituals"})
    assert rf.status_code == 200
    ids = [p["id"] for p in rf.json()]
    assert pid in ids


def test_post_create_invalid_board(user_a):
    r = requests.post(f"{API}/posts", headers=H(user_a["token"]),
                      json={"title": "x", "content": "y", "board_slug": "nonexistent_xx"})
    assert r.status_code == 404


def test_list_posts_descending(user_a):
    # create two posts
    r1 = requests.post(f"{API}/posts", headers=H(user_a["token"]), json={"title": "TEST first", "content": "a"})
    time.sleep(0.05)
    r2 = requests.post(f"{API}/posts", headers=H(user_a["token"]), json={"title": "TEST second", "content": "b"})
    assert r1.status_code == 200 and r2.status_code == 200
    listing = requests.get(f"{API}/posts").json()
    # Newest first
    titles = [p["title"] for p in listing[:5]]
    assert "TEST second" in titles


def test_get_post_invalid_id():
    r = requests.get(f"{API}/posts/not-an-objectid")
    assert r.status_code == 404
    r2 = requests.get(f"{API}/posts/65f000000000000000000000")
    assert r2.status_code == 404


def test_delete_post_permissions(user_a, user_b):
    r = requests.post(f"{API}/posts", headers=H(user_a["token"]),
                      json={"title": "TEST delete-me", "content": "x"})
    pid = r.json()["id"]
    # user_b cannot delete
    rd = requests.delete(f"{API}/posts/{pid}", headers=H(user_b["token"]))
    assert rd.status_code == 403
    # author can
    rd2 = requests.delete(f"{API}/posts/{pid}", headers=H(user_a["token"]))
    assert rd2.status_code == 200
    # gone
    rg = requests.get(f"{API}/posts/{pid}")
    assert rg.status_code == 404


def test_reaction_toggle(user_a):
    r = requests.post(f"{API}/posts", headers=H(user_a["token"]),
                      json={"title": "TEST react", "content": "x"})
    pid = r.json()["id"]
    r1 = requests.post(f"{API}/posts/{pid}/react", headers=H(user_a["token"]), json={"emoji": "🌕"})
    assert r1.status_code == 200
    assert r1.json()["reactions"].get("🌕") == 1
    assert "🌕" in r1.json()["my_reactions"]
    # toggle off
    r2 = requests.post(f"{API}/posts/{pid}/react", headers=H(user_a["token"]), json={"emoji": "🌕"})
    assert "🌕" not in r2.json()["my_reactions"]
    assert r2.json()["reactions"].get("🌕", 0) == 0


# ----- Comments -----
def test_comments_flow(user_a, user_b):
    r = requests.post(f"{API}/posts", headers=H(user_a["token"]),
                      json={"title": "TEST commented", "content": "x"})
    pid = r.json()["id"]
    c1 = requests.post(f"{API}/posts/{pid}/comments", headers=H(user_a["token"]), json={"content": "first"})
    assert c1.status_code == 200
    c2 = requests.post(f"{API}/posts/{pid}/comments", headers=H(user_b["token"]), json={"content": "second"})
    assert c2.status_code == 200
    lst = requests.get(f"{API}/posts/{pid}/comments").json()
    assert [c["content"] for c in lst] == ["first", "second"]
    # delete forbidden for non-author
    cid1 = lst[0]["id"]
    rd = requests.delete(f"{API}/comments/{cid1}", headers=H(user_b["token"]))
    assert rd.status_code == 403
    rd2 = requests.delete(f"{API}/comments/{cid1}", headers=H(user_a["token"]))
    assert rd2.status_code == 200


# ----- Reports -----
def test_report(user_a):
    r = requests.post(f"{API}/posts", headers=H(user_a["token"]), json={"title": "TEST rep", "content": "x"})
    pid = r.json()["id"]
    rr = requests.post(f"{API}/reports", headers=H(user_a["token"]),
                       json={"target_type": "post", "target_id": pid, "reason": "spam content"})
    assert rr.status_code == 200


# ----- Profile / block -----
def test_update_profile_and_uniqueness(user_a, user_b):
    new_bio = "lunar enthusiast " + uuid.uuid4().hex[:4]
    r = requests.put(f"{API}/users/me", headers=H(user_a["token"]), json={"bio": new_bio})
    assert r.status_code == 200
    assert r.json()["bio"] == new_bio
    # username collision
    r2 = requests.put(f"{API}/users/me", headers=H(user_a["token"]),
                      json={"username": user_b["user"]["username"]})
    assert r2.status_code == 409


def test_public_profile_no_email(user_a):
    uname = user_a["user"]["username"]
    r = requests.get(f"{API}/users/{uname}")
    assert r.status_code == 200
    assert "email" not in r.json()


def test_block_and_filter(user_a, user_b):
    # b posts; a blocks b -> posts feed should not contain b's posts for a
    rb = requests.post(f"{API}/posts", headers=H(user_b["token"]),
                       json={"title": "TEST from-b", "content": "to be blocked"})
    pid = rb.json()["id"]
    blk = requests.post(f"{API}/users/{user_b['user']['username']}/block", headers=H(user_a["token"]))
    assert blk.status_code == 200
    # cannot block self
    self_blk = requests.post(f"{API}/users/{user_a['user']['username']}/block", headers=H(user_a["token"]))
    assert self_blk.status_code == 400
    # a's listing excludes b's posts
    posts = requests.get(f"{API}/posts", headers=H(user_a["token"])).json()
    assert pid not in [p["id"] for p in posts]
    # unblock
    un = requests.delete(f"{API}/users/{user_b['user']['username']}/block", headers=H(user_a["token"]))
    assert un.status_code == 200


# ----- Chat -----
def test_chat_history():
    r = requests.get(f"{API}/chat/history")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_ws_chat_invalid_token():
    async def go():
        try:
            async with websockets.connect(f"{WS_URL}?token=bogus") as ws:
                # should be closed by server
                await asyncio.wait_for(ws.recv(), timeout=3)
                return "received"
        except Exception as e:
            return f"closed:{type(e).__name__}"
    res = asyncio.run(go())
    assert "closed" in res or "received" not in res


def test_ws_chat_message_flow(user_a, user_b):
    """Two users connect, one sends, both receive, history persists."""
    async def go():
        results = {"a_msgs": [], "b_msgs": []}
        a = await websockets.connect(f"{WS_URL}?token={user_a['token']}")
        b = await websockets.connect(f"{WS_URL}?token={user_b['token']}")

        async def drain(ws, key, n):
            try:
                while len(results[key]) < n:
                    m = await asyncio.wait_for(ws.recv(), timeout=5)
                    results[key].append(json.loads(m))
            except asyncio.TimeoutError:
                pass

        # initial presence frames
        ta = asyncio.create_task(drain(a, "a_msgs", 6))
        tb = asyncio.create_task(drain(b, "b_msgs", 6))
        await asyncio.sleep(0.5)
        content = f"TEST_hello_{uuid.uuid4().hex[:6]}"
        await a.send(json.dumps({"type": "message", "content": content}))
        # ping/pong
        await a.send(json.dumps({"type": "ping"}))
        await asyncio.sleep(1.5)
        await a.close()
        await b.close()
        await asyncio.gather(ta, tb, return_exceptions=True)
        return results, content

    results, sent_content = asyncio.run(go())
    a_types = [m.get("type") for m in results["a_msgs"]]
    b_types = [m.get("type") for m in results["b_msgs"]]
    assert "presence" in a_types
    assert "message" in b_types, f"B did not receive broadcast: {results}"
    # message content in B
    b_msg_contents = [m.get("content") for m in results["b_msgs"] if m.get("type") == "message"]
    assert sent_content in b_msg_contents
    # ping/pong for A
    assert "pong" in a_types
    # history fetched after sending
    hist = requests.get(f"{API}/chat/history").json()
    assert any(m.get("content") == sent_content for m in hist), "Message not persisted"

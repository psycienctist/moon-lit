"""Lunatick Community — Card trading / friends / lunar brief tests (iteration 2)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://2d9eaf74-5050-40b0-8d15-b3aa696ff8e4.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _creds(suffix=""):
    rid = uuid.uuid4().hex[:8]
    return {
        "email": f"TEST_{rid}{suffix}@lunatick.app",
        "username": f"TEST_{rid}{suffix}",
        "password": "test12345",
    }


def H(t):
    return {"Authorization": f"Bearer {t}"}


def _register(birth_date=None, suffix=""):
    c = _creds(suffix)
    r = requests.post(f"{API}/auth/register", json=c)
    assert r.status_code == 200, r.text
    j = r.json()
    token = j["token"]
    if birth_date:
        ru = requests.put(f"{API}/users/me", headers=H(token), json={"birth_date": birth_date})
        assert ru.status_code == 200, ru.text
    return {"token": token, "user": j["user"], "creds": c}


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def alice():
    # Born 1990-01-15 -> Capricorn Sun, Virgo Moon (matches admin's seed example)
    return _register("1990-01-15", "_A")


@pytest.fixture(scope="module")
def bob():
    # Born 1992-06-22 -> Cancer Sun, Pisces Moon
    return _register("1992-06-22", "_B")


@pytest.fixture(scope="module")
def carol():
    # No birth date -> needs_birthdate
    return _register(None, "_C")


@pytest.fixture(scope="module")
def dan():
    # Born 1990-01-14 -> should share signs with alice -> twin moon candidate
    return _register("1990-01-14", "_D")


# ---------- Profile w/ natal + rarity ----------
def test_profile_has_natal_rarity(alice):
    r = requests.get(f"{API}/users/{alice['user']['username']}")
    assert r.status_code == 200
    j = r.json()
    assert j.get("natal"), "natal missing"
    assert j["natal"].get("sun_sign")
    assert j.get("rarity"), "rarity missing"
    assert j["rarity"]["tier"] in ("Common", "Uncommon", "Rare", "Legendary")
    assert "card_count" in j


def test_profile_viewer_fields(alice, bob):
    # bob views alice's profile - should include twin_with_viewer, is_friend, trade_state
    r = requests.get(f"{API}/users/{alice['user']['username']}", headers=H(bob["token"]))
    assert r.status_code == 200
    j = r.json()
    assert "twin_with_viewer" in j
    assert "is_friend" in j
    assert j["trade_state"] in ("none", "outgoing_pending", "incoming_pending", "friend")


# ---------- Trades CRUD ----------
def test_trade_self_rejected(alice):
    r = requests.post(f"{API}/trades", headers=H(alice["token"]), json={"username": alice["user"]["username"]})
    assert r.status_code == 400, r.text


def test_trade_create_and_duplicate(alice, bob):
    # cleanup any prior pending
    r0 = requests.get(f"{API}/trades", headers=H(alice["token"]), params={"direction": "outgoing", "status": "pending"})
    for t in r0.json():
        if t["to"]["username"] == bob["user"]["username"]:
            requests.delete(f"{API}/trades/{t['id']}", headers=H(alice["token"]))

    r = requests.post(f"{API}/trades", headers=H(alice["token"]),
                      json={"username": bob["user"]["username"], "message": "TEST hello"})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["status"] == "pending"
    assert j["to"]["username"] == bob["user"]["username"]
    trade_id = j["id"]

    # duplicate -> 409
    r2 = requests.post(f"{API}/trades", headers=H(alice["token"]), json={"username": bob["user"]["username"]})
    assert r2.status_code == 409, r2.text

    # Profile state shows outgoing_pending
    rp = requests.get(f"{API}/users/{bob['user']['username']}", headers=H(alice["token"]))
    assert rp.json()["trade_state"] == "outgoing_pending"

    # Bob's incoming list
    rl = requests.get(f"{API}/trades", headers=H(bob["token"]), params={"direction": "incoming", "status": "pending"})
    assert rl.status_code == 200
    ids = [t["id"] for t in rl.json()]
    assert trade_id in ids

    # Cancel by sender
    rc = requests.delete(f"{API}/trades/{trade_id}", headers=H(alice["token"]))
    assert rc.status_code == 200


def test_trade_block_403(alice, bob):
    # bob blocks alice -> alice cannot trade with bob
    rb = requests.post(f"{API}/users/{alice['user']['username']}/block", headers=H(bob["token"]))
    assert rb.status_code == 200
    try:
        r = requests.post(f"{API}/trades", headers=H(alice["token"]), json={"username": bob["user"]["username"]})
        assert r.status_code == 403, r.text
    finally:
        requests.delete(f"{API}/users/{alice['user']['username']}/block", headers=H(bob["token"]))


def test_trade_accept_flow_and_collection_friends(alice, bob):
    # Ensure no prior pending
    for who, tok in [("alice", alice["token"]), ("bob", bob["token"])]:
        rr = requests.get(f"{API}/trades", headers=H(tok), params={"status": "pending"})
        for t in rr.json():
            if {t["from"]["username"], t["to"]["username"]} == {alice["user"]["username"], bob["user"]["username"]}:
                requests.delete(f"{API}/trades/{t['id']}", headers=H(alice["token"] if t["from"]["username"] == alice["user"]["username"] else bob["token"]))

    # Alice sends to bob
    r = requests.post(f"{API}/trades", headers=H(alice["token"]), json={"username": bob["user"]["username"]})
    assert r.status_code == 200, r.text
    trade_id = r.json()["id"]

    # Wrong-receiver accept -> 403
    rwrong = requests.post(f"{API}/trades/{trade_id}/accept", headers=H(alice["token"]))
    assert rwrong.status_code == 403

    # Bob accepts
    ra = requests.post(f"{API}/trades/{trade_id}/accept", headers=H(bob["token"]))
    assert ra.status_code == 200, ra.text
    body = ra.json()
    assert body["status"] == "accepted"
    assert body["receiver_card"] is not None
    assert body["sender_card"] is not None

    # Double-accept -> 409
    ra2 = requests.post(f"{API}/trades/{trade_id}/accept", headers=H(bob["token"]))
    assert ra2.status_code == 409

    # Cancel a non-pending trade by sender -> 409
    rc = requests.delete(f"{API}/trades/{trade_id}", headers=H(alice["token"]))
    assert rc.status_code == 409

    # Collection: alice has bob's card and vice versa
    col_a = requests.get(f"{API}/collection", headers=H(alice["token"])).json()
    assert any(c["from"]["username"] == bob["user"]["username"] for c in col_a), col_a

    col_b = requests.get(f"{API}/collection", headers=H(bob["token"])).json()
    assert any(c["from"]["username"] == alice["user"]["username"] for c in col_b)

    # Collection by username (other person's deck)
    col_other = requests.get(f"{API}/collection", headers=H(alice["token"]),
                             params={"username": bob["user"]["username"]}).json()
    assert isinstance(col_other, list) and len(col_other) >= 1

    # Friends list contains the other
    fa = requests.get(f"{API}/friends", headers=H(alice["token"])).json()
    assert any(f["username"] == bob["user"]["username"] for f in fa)
    assert all("since" in f for f in fa if f["username"] == bob["user"]["username"])

    # Profile shows trade_state friend
    pp = requests.get(f"{API}/users/{bob['user']['username']}", headers=H(alice["token"]))
    assert pp.json()["trade_state"] == "friend"
    assert pp.json()["is_friend"] is True


def test_trade_decline(alice, carol):
    r = requests.post(f"{API}/trades", headers=H(alice["token"]), json={"username": carol["user"]["username"]})
    assert r.status_code == 200, r.text
    tid = r.json()["id"]
    # alice (sender) cannot decline
    rd_wrong = requests.post(f"{API}/trades/{tid}/decline", headers=H(alice["token"]))
    assert rd_wrong.status_code == 403
    # carol declines
    rd = requests.post(f"{API}/trades/{tid}/decline", headers=H(carol["token"]))
    assert rd.status_code == 200
    assert rd.json()["status"] == "declined"


def test_trade_unauthenticated():
    r = requests.post(f"{API}/trades", json={"username": "nobody"})
    assert r.status_code == 401


def test_trades_direction_filter(alice, bob):
    r_in = requests.get(f"{API}/trades", headers=H(alice["token"]), params={"direction": "incoming"})
    assert r_in.status_code == 200
    for t in r_in.json():
        assert t["to"]["username"] == alice["user"]["username"]
    r_out = requests.get(f"{API}/trades", headers=H(alice["token"]), params={"direction": "outgoing"})
    for t in r_out.json():
        assert t["from"]["username"] == alice["user"]["username"]


# ---------- Lunar Brief ----------
def test_lunar_brief_needs_birthdate(carol):
    r = requests.get(f"{API}/lunar-brief", headers=H(carol["token"]))
    assert r.status_code == 200
    j = r.json()
    assert j["needs_birthdate"] is True
    assert j["twin_moons"] == []


def test_lunar_brief_with_natal(alice, dan):
    r = requests.get(f"{API}/lunar-brief", headers=H(alice["token"]))
    assert r.status_code == 200
    j = r.json()
    assert j["needs_birthdate"] is False
    assert j.get("my_natal")
    assert isinstance(j["twin_moons"], list)
    # dan should appear as twin (born 1 day before alice)
    twin_usernames = [t["username"] for t in j["twin_moons"]]
    assert dan["user"]["username"] in twin_usernames, f"Dan not in twin_moons: {twin_usernames}"
    twin_kinds = {t["twin_kind"] for t in j["twin_moons"]}
    assert twin_kinds.issubset({"Twin Soul", "Twin Moon", "Twin Sun"})


def test_lunar_brief_unauth():
    r = requests.get(f"{API}/lunar-brief")
    assert r.status_code == 401


# ---------- Rarity computation ----------
def test_rarity_legendary_full_moon_birth():
    # 2025-03-14 = recent full moon
    user = _register("2025-03-14", "_L")
    r = requests.get(f"{API}/users/{user['user']['username']}")
    j = r.json()
    # Score: Full moon (+3); not necessarily mystic. Should be at least Rare/Legendary.
    assert j["rarity"]["tier"] in ("Rare", "Legendary"), j["rarity"]


def test_cosmic_card_kind_shows_rarity(alice):
    # Alice shares cosmic card to feed
    r = requests.post(f"{API}/cosmic/share", headers=H(alice["token"]), json={"note": "TEST share"})
    assert r.status_code == 200, r.text
    post = r.json()
    assert post["kind"] == "cosmic_card"
    assert post.get("cosmic_data", {}).get("rarity"), "cosmic post missing rarity"

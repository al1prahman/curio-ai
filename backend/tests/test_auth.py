"""Authentication tests."""

import pytest


class TestLogin:
    async def test_login_success(self, client, admin_user):
        r = await client.post(
            "/api/v1/auth/login",
            json={"email": admin_user.email, "password": "testpass123"},
        )
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client, admin_user):
        r = await client.post(
            "/api/v1/auth/login",
            json={"email": admin_user.email, "password": "wrongpassword"},
        )
        assert r.status_code == 401

    async def test_login_nonexistent_user(self, client):
        r = await client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@test.com", "password": "whatever"},
        )
        assert r.status_code == 401


class TestMe:
    async def test_me_with_token(self, client, auth_headers, admin_user):
        r = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == admin_user.email
        assert data["role"] == "ADMIN"

    async def test_me_without_token(self, client):
        r = await client.get("/api/v1/auth/me")
        assert r.status_code == 401


class TestRefresh:
    async def test_refresh_success(self, client, admin_user):
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": admin_user.email, "password": "testpass123"},
        )
        refresh_token = login.json()["refresh_token"]

        r = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert r.status_code == 200
        assert "access_token" in r.json()

    async def test_refresh_invalid_token(self, client):
        r = await client.post("/api/v1/auth/refresh", json={"refresh_token": "invalid.token.here"})
        assert r.status_code == 401


class TestLogout:
    async def test_logout(self, client, auth_headers):
        r = await client.post("/api/v1/auth/logout", headers=auth_headers)
        assert r.status_code == 204

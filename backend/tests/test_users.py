"""RBAC and user management tests."""



class TestUserCRUD:
    async def test_list_users(self, client, auth_headers):
        r = await client.get("/api/v1/users", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert data["total"] >= 1

    async def test_create_user(self, client, auth_headers):
        r = await client.post(
            "/api/v1/users",
            headers=auth_headers,
            json={
                "email": "newuser@test.com",
                "password": "password123",
                "full_name": "New User",
                "role": "EMPLOYEE",
            },
        )
        assert r.status_code == 201
        assert r.json()["email"] == "newuser@test.com"

    async def test_create_duplicate_email(self, client, auth_headers, admin_user):
        r = await client.post(
            "/api/v1/users",
            headers=auth_headers,
            json={
                "email": admin_user.email,
                "password": "password123",
                "full_name": "Duplicate",
                "role": "EMPLOYEE",
            },
        )
        assert r.status_code == 409

    async def test_create_invalid_role(self, client, auth_headers):
        r = await client.post(
            "/api/v1/users",
            headers=auth_headers,
            json={
                "email": "bad@test.com",
                "password": "password123",
                "full_name": "Bad Role",
                "role": "SUPERUSER",
            },
        )
        assert r.status_code == 400

    async def test_update_user(self, client, auth_headers, admin_user):
        r = await client.patch(
            f"/api/v1/users/{admin_user.id}",
            headers=auth_headers,
            json={"full_name": "Updated Name"},
        )
        assert r.status_code == 200
        assert r.json()["full_name"] == "Updated Name"

    async def test_deactivate_user(self, client, auth_headers, admin_user):
        r = await client.delete(f"/api/v1/users/{admin_user.id}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "INACTIVE"


class TestRBAC:
    async def test_employee_cannot_list_users(self, client, employee_headers):
        r = await client.get("/api/v1/users", headers=employee_headers)
        assert r.status_code == 403

    async def test_employee_cannot_create_user(self, client, employee_headers):
        r = await client.post(
            "/api/v1/users",
            headers=employee_headers,
            json={
                "email": "x@test.com",
                "password": "password123",
                "full_name": "X",
                "role": "EMPLOYEE",
            },
        )
        assert r.status_code == 403

    async def test_unauthenticated_returns_401(self, client):
        r = await client.get("/api/v1/users")
        assert r.status_code == 401

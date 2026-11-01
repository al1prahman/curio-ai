ROLE_PERMISSIONS: dict[str, set[str]] = {
    "ADMIN": {
        "dashboard.view",
        "users.view",
        "users.create",
        "users.update",
        "users.delete",
        "roles.manage",
        "documents.view",
        "documents.upload",
        "documents.update",
        "documents.delete",
        "documents.manage_permissions",
        "collections.view",
        "collections.manage",
        "chat.use",
        "chat.view_own",
        "analytics.view",
        "settings.manage",
        "audit_logs.view",
    },
    "MANAGER": {
        "dashboard.view",
        "documents.view",
        "documents.upload",
        "documents.update",
        "documents.delete",
        "documents.manage_permissions",
        "collections.view",
        "collections.manage",
        "chat.use",
        "chat.view_own",
        "analytics.view",
    },
    "EMPLOYEE": {
        "dashboard.view",
        "documents.view_authorized",
        "collections.view_authorized",
        "chat.use",
        "chat.view_own",
    },
}

VALID_ROLES = set(ROLE_PERMISSIONS.keys())


def role_has_permission(role: str, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


def permissions_for_role(role: str) -> set[str]:
    return ROLE_PERMISSIONS.get(role, set())

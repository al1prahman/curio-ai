from fastapi import APIRouter

from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.chat import router as chat_router
from app.api.v1.endpoints.collections import router as collections_router
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.feedback import router as feedback_router
from app.api.v1.endpoints.permissions import router as permissions_router
from app.api.v1.endpoints.users import router as users_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(collections_router)
api_router.include_router(documents_router)
api_router.include_router(permissions_router)
api_router.include_router(chat_router)
api_router.include_router(feedback_router)
api_router.include_router(analytics_router)


@api_router.get("/ping")
async def ping() -> dict[str, str]:
    return {"message": "pong"}

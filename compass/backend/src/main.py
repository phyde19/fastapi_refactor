from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from routers.auth import router as auth_router
from routers.plugin_routes import chat_router, plugin_config_router, plugin_menu_router

app = FastAPI(title=settings.api_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Conversation-Id"],
)

app.include_router(auth_router)
app.include_router(plugin_menu_router)
app.include_router(plugin_config_router)
app.include_router(chat_router)


@app.get("/")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.api_name}

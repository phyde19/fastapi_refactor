from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from routers.auth import router as auth_router
from routers.plugin_routes import chat_router, plugin_config_router, plugin_menu_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(title=settings.api_name)

origins = [
    os.getenv("FRONTEND_URL"),
    os.getenv("FRONTEND_URL_ALT"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin for origin in origins if origin],
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

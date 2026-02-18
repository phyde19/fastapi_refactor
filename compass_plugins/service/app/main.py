from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.responses import StreamingResponse

from app.config.settings import settings
from app.contracts import ErrorFrame, PluginServiceRequest
from app.dispatcher import dispatcher

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("compass_plugins.main")

app = FastAPI(title=settings.plugin_service_name)


@app.get("/")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.plugin_service_name}


@app.post("/plugin/response")
async def plugin_response(request: PluginServiceRequest):
    handler = dispatcher.resolve(request.plugin_id)

    async def stream():
        try:
            async for frame in handler.stream(request):
                yield frame.serialize()
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.exception(
                "Unhandled plugin service error request_id=%s plugin_id=%s",
                request.request_id,
                request.plugin_id,
            )
            yield ErrorFrame(
                content={
                    "code": "UNHANDLED_PLUGIN_SERVICE_ERROR",
                    "message": "Plugin service failed unexpectedly.",
                    "retryable": False,
                    "details": {"error": str(exc)},
                }
            ).serialize()

    return StreamingResponse(stream(), media_type="application/x-ndjson")

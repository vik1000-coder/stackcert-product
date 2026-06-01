from __future__ import annotations

import json
import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request, Response

from stackcert_service.config import settings

try:  # pragma: no cover - exercised only when the optional package is installed.
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
except ImportError:  # pragma: no cover - local minimal installs can still run.
    sentry_sdk = None
    FastApiIntegration = None


logger = logging.getLogger("stackcert_service.requests")
_sentry_configured = False


def configure_logging() -> None:
    logging.basicConfig(
        level="INFO",
        format="%(message)s",
    )
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def configure_error_reporting() -> None:
    global _sentry_configured
    if _sentry_configured or not settings.sentry_dsn or sentry_sdk is None:
        return
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        release=settings.release_version,
        integrations=[FastApiIntegration()] if FastApiIntegration else [],
        traces_sample_rate=0.0,
        send_default_pii=False,
    )
    _sentry_configured = True


async def request_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex}"
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)

    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    logger.info(
        json.dumps(
            {
                "event": "http_request",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
            sort_keys=True,
        )
    )
    return response

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

# Global rate-limiter instance.
# Attach to the FastAPI app via:
#
#   app.state.limiter = limiter
#   app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
#
# Then decorate individual routes with:
#
#   @limiter.limit("10/minute")
#   async def my_route(request: Request): ...
#
limiter = Limiter(key_func=get_remote_address)

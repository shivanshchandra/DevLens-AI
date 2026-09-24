import sys
import multiprocessing

if sys.platform == "win32":
    try:
        import multiprocessing.context
        multiprocessing.context._concrete_contexts["fork"] = multiprocessing.get_context("spawn")
    except Exception:
        pass

from redis import Redis
from rq import Queue

from app.core.config import settings


def get_redis() -> Redis:
    return Redis.from_url(settings.REDIS_URL.strip())


def get_queue(name: str = "default") -> Queue:
    return Queue(name, connection=get_redis())
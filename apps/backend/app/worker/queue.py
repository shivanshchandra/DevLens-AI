from redis import Redis
from rq import Queue

from app.core.config import settings


def get_redis() -> Redis:
    return Redis.from_url(settings.REDIS_URL)


def get_queue(name: str = "default") -> Queue:
    return Queue(name, connection=get_redis())
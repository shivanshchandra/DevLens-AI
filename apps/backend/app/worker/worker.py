import os
import sys
import multiprocessing

if sys.platform == "win32":
    try:
        import multiprocessing.context
        multiprocessing.context._concrete_contexts["fork"] = multiprocessing.get_context("spawn")
    except Exception:
        pass

import redis
from rq import Worker, Queue
from rq.worker import SimpleWorker
from app.core.config import settings


def main():
    redis_url = settings.REDIS_URL or os.getenv("REDIS_URL", "redis://localhost:6379/0")
    conn = redis.from_url(redis_url.strip())

    q = Queue("default", connection=conn)

    worker_cls = SimpleWorker if os.name == "nt" else Worker
    worker = worker_cls([q], connection=conn)
    print(f"[Worker] Started listening on 'default' queue ({worker_cls.__name__})...", flush=True)
    worker.work(with_scheduler=(os.name != "nt"))


if __name__ == "__main__":
    main()
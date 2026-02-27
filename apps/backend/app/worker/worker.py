import os
import redis
from rq import Worker, Queue

def main():
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    conn = redis.from_url(redis_url)

    # queues to listen to
    q = Queue("default", connection=conn)

    worker = Worker([q], connection=conn)
    worker.work(with_scheduler=True)

if __name__ == "__main__":
    main()
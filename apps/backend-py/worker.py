"""
RQ Worker Module for StashFlow.
------------------------------
This script starts a background worker that processes tasks from the Redis queue.
It uses the configuration from the core queue module to connect to the correct
Redis instance and queue.
"""

from rq import Worker
from src.core.queue import redis_conn, settings

if __name__ == '__main__':
    # PSEUDOCODE: Worker Startup
    # 1. Log the queue name the worker is listening on.
    # 2. Initialize the RQ Worker with the specific queue and Redis connection.
    # 3. Start the blocking work loop.

    print(f"Starting RQ worker on queue: {settings.QUEUE_NAME}...")
    
    # In RQ 2.x, connections are passed explicitly to the Worker constructor.
    # The previous 'Connection' context manager has been deprecated/removed.
    worker = Worker([settings.QUEUE_NAME], connection=redis_conn)
    worker.work()

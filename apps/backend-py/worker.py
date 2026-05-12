from rq import Worker, Connection
from src.core.queue import redis_conn, settings

if __name__ == '__main__':
    print(f"Starting RQ worker on queue: {settings.QUEUE_NAME}...")
    with Connection(redis_conn):
        worker = Worker([settings.QUEUE_NAME])
        worker.work()

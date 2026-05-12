"""
Task Queue Module for StashFlow.

This module initializes the connection to Redis and sets up the RQ (Redis Queue) 
for background task processing.

Attributes:
    redis_conn (Redis): Connection instance to the Redis server.
    ingestion_queue (Queue): The main queue for document ingestion and processing.
"""
from redis import Redis
from rq import Queue
from .config import settings

redis_conn = Redis.from_url(settings.REDIS_URL)
ingestion_queue = Queue(settings.QUEUE_NAME, connection=redis_conn)

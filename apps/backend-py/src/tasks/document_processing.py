"""
Background Tasks Module for StashFlow.

This module contains the task definitions for background document processing, 
including downloading files from storage, running extraction logic, and 
sending results via webhooks.
"""
import asyncio
import httpx
from supabase import create_client, Client
from src.core.config import settings
from src.core.document_service import process_document_content
from src.core.logger import get_logger

logger = get_logger(__name__)

async def process_document_task(document_id: str, storage_path: str, password: str | None = None):
    """
    Background task to process a document from storage to webhook.

    This task handles the orchestration of downloading a document from Supabase 
    Storage, triggering the AI processing service, and reporting the final 
    results back to the Supabase Edge Function via a secure webhook.

    Args:
        document_id (str): The unique identifier for the document in the database.
        storage_path (str): The path to the document in Supabase Storage.
        password (str | None): Optional password for encrypted PDFs.

    Returns:
        None

    Raises:
        Exception: If download, processing, or webhook delivery fails.
    """
    # PSEUDOCODE: Background Processing Pipeline
    # 1. Initialize Supabase Client using service role credentials.
    # 2. Download raw file bytes from the 'user_documents' storage bucket.
    # 3. Call 'process_document_content' to perform text extraction and AI analysis.
    # 4. Transmit results:
    #    a. Construct a POST request to the 'document-processed-webhook' Edge Function.
    #    b. Include the document_id and the full extraction result in the payload.
    #    c. Authenticate using the service role key and a shared webhook secret.
    # 5. Error Handling: If any step fails, attempt to notify the webhook of 
    #    the failure to update the document status in the database.
    
    logger.info("task_start", document_id=document_id, storage_path=storage_path)
    
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.error("task_failed_missing_config")
        return

    try:
        # 1. Initialize Supabase
        supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        
        # 2. Download from storage
        logger.info("task_download_start", storage_path=storage_path)
        file_data = supabase.storage.from_("user_documents").download(storage_path)
        
        # 3. Process document
        logger.info("task_processing_start", document_id=document_id)
        # Wrap async call since RQ worker is usually sync (we'll run the event loop here)
        result = await process_document_content(file_data, storage_path, password=password)
        
        # 4. Callback to Supabase Webhook
        webhook_url = f"{settings.SUPABASE_URL}/functions/v1/document-processed-webhook"
        logger.info("task_callback_start", url=webhook_url)
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                webhook_url,
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "x-webhook-secret": settings.WEBHOOK_SECRET,
                    "Content-Type": "application/json"
                },
                json={
                    "document_id": document_id,
                    "result": result.model_dump()
                },
                timeout=30.0
            )
            resp.raise_for_status()
            
        logger.info("task_success", document_id=document_id)

    except Exception as e:
        logger.error("task_failed", document_id=document_id, error=str(e))
        # Optional: Call webhook with error status
        try:
             webhook_url = f"{settings.SUPABASE_URL}/functions/v1/document-processed-webhook"
             async with httpx.AsyncClient() as client:
                await client.post(
                    webhook_url,
                    headers={
                        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                        "x-webhook-secret": settings.WEBHOOK_SECRET,
                        "Content-Type": "application/json"
                    },
                    json={
                        "document_id": document_id,
                        "error": str(e)
                    }
                )
        except Exception:
            pass
        raise

def run_process_document_task(document_id: str, storage_path: str, password: str | None = None):
    """
    Synchronous wrapper for RQ to execute the async process_document_task.

    Args:
        document_id (str): The unique identifier for the document.
        storage_path (str): The path in storage.
        password (str | None): Optional PDF password.
    """
    asyncio.run(process_document_task(document_id, storage_path, password))

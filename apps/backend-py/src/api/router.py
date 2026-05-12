from fastapi import APIRouter
from .endpoints import documents, transactions, analysis

api_router = APIRouter()
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])

"""
Analysis Endpoints for StashFlow.

This module provides API endpoints for performing complex financial analysis, 
such as anomaly detection in transaction histories using statistical models 
and AI interpretation.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import pandas as pd
from src.schemas.financial import TransactionRecord, AnomalyReportSchema
from src.core.config import settings
from src.core.logger import get_logger
from src.core.ai import client

router = APIRouter()
logger = get_logger(__name__)

class AnomalyRequest(BaseModel):
    """
    Schema for the anomaly detection request.
    
    Attributes:
        transactions (List[TransactionRecord]): A list of transaction records 
            to be analyzed for spending spikes.
    """
    transactions: List[TransactionRecord]

@router.post("/anomalies", response_model=AnomalyReportSchema)
async def detect_anomalies(request: AnomalyRequest) -> AnomalyReportSchema:
    """
    Analyzes transaction history to detect spending anomalies using a hybrid statistical/AI approach.
    
    The function first performs a statistical scan for category-level spending spikes 
    relative to historical averages. If spikes are found, it uses an LLM to generate 
    human-readable insights and actionable advice.

    Args:
        request (AnomalyRequest): The request containing the transaction history.

    Returns:
        AnomalyReportSchema: A report containing detected anomalies and AI-generated insights.

    Raises:
        HTTPException: If the analysis process fails due to data processing errors 
            or AI service unavailability.
    """
    if not request.transactions:
        return AnomalyReportSchema(anomalies=[])

    logger.info("detect_anomalies_start", transaction_count=len(request.transactions))

    try:
        # PSEUDOCODE: Statistical Anomaly Detection
        # 1. Convert list of transaction objects into a Pandas DataFrame for vectorized processing.
        # 2. Normalize dates and group by month and category to calculate total periodic spend.
        # 3. Identify the current (most recent) month to compare against historical data.
        # 4. For each category:
        #    a. Calculate the mean historical spend (excluding the current month).
        #    b. Apply a sensitivity threshold (30% increase AND at least $50 delta).
        #    c. If current spend exceeds threshold, flag as an anomaly and extract top contributing items.
        
        df = pd.DataFrame([t.model_dump() for t in request.transactions])
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.to_period('M')
        
        monthly_category_spend = df.groupby(['month', 'category'])['amount'].sum().reset_index()
        latest_month = monthly_category_spend['month'].max()
        
        anomalies_to_explain = []
        
        for category, history in monthly_category_spend.groupby('category'):
            # We need at least one previous month to establish a baseline
            if len(history) < 2:
                continue
                
            latest_spend_series = history[history['month'] == latest_month]['amount']
            latest_spend = latest_spend_series.iloc[0] if not latest_spend_series.empty else 0
            
            historical_data = history[history['month'] < latest_month]
            if historical_data.empty:
                continue
                
            average_historical_spend = historical_data['amount'].mean()
            
            # BUSINESS RULE: Threshold: 30% increase AND at least $50 difference.
            # This prevents flagging small dollar amounts (e.g., $1 to $2) as significant anomalies.
            threshold = max(average_historical_spend * 1.3, average_historical_spend + 50)
            
            if latest_spend > threshold:
                increase_percentage = ((latest_spend / average_historical_spend) - 1) * 100
                anomalies_to_explain.append({
                    "category": category,
                    "latest_spend": latest_spend,
                    "avg_spend": average_historical_spend,
                    "increase_pct": round(increase_percentage, 1),
                    "recent_items": df[(df['category'] == category) & (df['month'] == latest_month)]['description'].unique().tolist()[:5]
                })

        if not anomalies_to_explain:
            logger.info("detect_anomalies_no_statistical_spikes")
            return AnomalyReportSchema(anomalies=[])

        logger.info("detect_anomalies_spikes_found", categories=[a['category'] for a in anomalies_to_explain])

        # PSEUDOCODE: AI Interpretation Layer
        # 1. Format the statistical findings into a structured text context for the LLM.
        # 2. Instruct the model to act as a financial advisor.
        # 3. Provide the context and request concise, actionable insights for each anomaly.
        # 4. Return the structured response validated against AnomalyReportSchema.

        formatted_context = ""
        for a in anomalies_to_explain:
            formatted_context += f"- Category: {a['category']}, This Month: {a['latest_spend']}, Avg: {a['avg_spend']} (+{a['increase_pct']}%)\n"
            formatted_context += f"  Recent items: {', '.join(a['recent_items'])}\n"

        ai_analysis = client.chat.completions.create(
            model=settings.DEFAULT_AI_MODEL,
            response_model=AnomalyReportSchema,
            messages=[
                {
                    "role": "system",
                    "content": "You are a senior financial advisor. I will provide you with spending categories that have shown a significant statistical increase this month. For each category, provide a human-readable description of the anomaly and one specific, actionable recommendation to help the user reduce this cost next month. Be concise and professional."
                },
                {
                    "role": "user",
                    "content": f"Analyze these spending spikes and provide insights:\n\n{formatted_context}"
                }
            ]
        )
        
        logger.info("detect_anomalies_success", insight_count=len(ai_analysis.anomalies))
        return ai_analysis

    except Exception as e:
        # STRATEGIC LOGGING: We catch all exceptions here to ensure we log the failure 
        # in our structured logs before returning a generic 500 to the user.
        logger.error("detect_anomalies_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

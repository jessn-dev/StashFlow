from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import pandas as pd
import instructor
from litellm import completion
from src.schemas.financial import TransactionRecord, AnomalyReportSchema
from src.core.config import settings
from src.core.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

# Patch litellm with instructor
client = instructor.from_litellm(completion)

class AnomalyRequest(BaseModel):
    transactions: List[TransactionRecord]

@router.post("/anomalies", response_model=AnomalyReportSchema)
async def detect_anomalies(request: AnomalyRequest):
    """
    Analyzes transaction history to detect spending anomalies using a hybrid statistical/AI approach.
    """
    if not request.transactions:
        return AnomalyReportSchema(anomalies=[])

    logger.info("detect_anomalies_start", transaction_count=len(request.transactions))

    try:
        # 1. Statistical Analysis with Pandas
        df = pd.DataFrame([t.model_dump() for t in request.transactions])
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.to_period('M')
        
        # Aggregate monthly spending by category
        monthly_category = df.groupby(['month', 'category'])['amount'].sum().reset_index()
        
        # Get the most recent month
        latest_month = monthly_category['month'].max()
        
        anomalies_to_explain = []
        
        # Group by category and look for spikes
        for category, group in monthly_category.groupby('category'):
            if len(group) < 2:
                continue
                
            latest_spend = group[group['month'] == latest_month]['amount'].iloc[0] if not group[group['month'] == latest_month].empty else 0
            historic_group = group[group['month'] < latest_month]
            
            if historic_group.empty:
                continue
                
            avg_spend = historic_group['amount'].mean()
            
            # Threshold: 30% increase AND at least $50 (or equivalent) difference
            threshold = max(avg_spend * 1.3, avg_spend + 50)
            
            if latest_spend > threshold:
                increase_pct = ((latest_spend / avg_spend) - 1) * 100
                anomalies_to_explain.append({
                    "category": category,
                    "latest_spend": latest_spend,
                    "avg_spend": avg_spend,
                    "increase_pct": round(increase_pct, 1),
                    "recent_items": df[(df['category'] == category) & (df['month'] == latest_month)]['description'].unique().tolist()[:5]
                })

        if not anomalies_to_explain:
            logger.info("detect_anomalies_no_statistical_spikes")
            return AnomalyReportSchema(anomalies=[])

        logger.info("detect_anomalies_spikes_found", categories=[a['category'] for a in anomalies_to_explain])

        # 2. AI Explanation Layer
        context = ""
        for a in anomalies_to_explain:
            context += f"- Category: {a['category']}, This Month: {a['latest_spend']}, Avg: {a['avg_spend']} (+{a['increase_pct']}%)\n"
            context += f"  Recent items: {', '.join(a['recent_items'])}\n"

        extraction = client.chat.completions.create(
            model=settings.DEFAULT_AI_MODEL,
            response_model=AnomalyReportSchema,
            messages=[
                {
                    "role": "system",
                    "content": "You are a senior financial advisor. I will provide you with spending categories that have shown a significant statistical increase this month. For each category, provide a human-readable description of the anomaly and one specific, actionable recommendation to help the user reduce this cost next month. Be concise and professional."
                },
                {
                    "role": "user",
                    "content": f"Analyze these spending spikes and provide insights:\n\n{context}"
                }
            ]
        )
        
        logger.info("detect_anomalies_success", insight_count=len(extraction.anomalies))
        return extraction

    except Exception as e:
        logger.error("detect_anomalies_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

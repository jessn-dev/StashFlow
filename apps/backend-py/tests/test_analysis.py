import pytest
from unittest.mock import MagicMock, patch

@pytest.mark.asyncio
async def test_detect_anomalies_empty(client):
    response = await client.post("/api/v1/analysis/anomalies", json={"transactions": []})
    assert response.status_code == 200
    assert response.json() == {"anomalies": []}

@pytest.mark.asyncio
@patch("src.api.endpoints.analysis.client.chat.completions.create")
async def test_detect_anomalies_spikes(mock_ai_create, client):
    # Mock AI response
    mock_response = MagicMock()
    mock_insight = MagicMock()
    mock_insight.category = "shopping"
    mock_insight.description = "Significant spike in shopping"
    mock_insight.severity = "high"
    mock_insight.recommended_action = "Reduce non-essential shopping"
    mock_response.anomalies = [mock_insight]
    mock_ai_create.return_value = mock_response
    
    # Create transactions with a spike
    transactions = []
    # Historic (Feb 2026)
    for _ in range(5):
        transactions.append({
            "id": "1", "date": "2026-02-01", "amount": 10, "category": "shopping", "description": "old"
        })
    # Latest (May 2026 - current date in session context is May 11, 2026)
    transactions.append({
        "id": "2", "date": "2026-05-01", "amount": 200, "category": "shopping", "description": "new expensive"
    })
    
    response = await client.post("/api/v1/analysis/anomalies", json={"transactions": transactions})
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["anomalies"]) == 1
    assert data["anomalies"][0]["category"] == "shopping"

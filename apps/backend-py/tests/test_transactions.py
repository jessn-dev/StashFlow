import pytest
from unittest.mock import MagicMock, patch

@pytest.mark.asyncio
async def test_categorize_empty_description(client):
    response = await client.post("/api/v1/transactions/categorize", json={"description": ""})
    assert response.status_code == 400

@pytest.mark.asyncio
@patch("src.api.endpoints.transactions.client.chat.completions.create")
async def test_categorize_happy_path(mock_ai_create, client):
    mock_response = MagicMock()
    mock_response.category = "food"
    mock_response.confidence = 0.95
    mock_response.reasoning = "Transaction contains 'Starbucks'"
    mock_ai_create.return_value = mock_response
    
    response = await client.post("/api/v1/transactions/categorize", json={"description": "Starbucks Coffee", "amount": 5.50})
    
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "food"
    assert data["confidence"] == 0.95

import json
import sys
from pathlib import Path

# Add src to path so we can import models
sys.path.append(str(Path(__file__).parent.parent))

from src.schemas.financial import (
    LoanExtractionSchema, 
    TransactionCategorizationSchema, 
    AnomalyReportSchema,
    UnifiedDocumentResponse
)

def export_schemas():
    """
    Exports Pydantic models as JSON Schema files.
    """
    # Target directory in the shared TypeScript package
    output_dir = Path(__file__).parent.parent.parent.parent / "packages" / "document-parser" / "schemas"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Export individual schemas
    schemas = {
        "loan_schema.json": LoanExtractionSchema.model_json_schema(),
        "transaction_schema.json": TransactionCategorizationSchema.model_json_schema(),
        "anomaly_schema.json": AnomalyReportSchema.model_json_schema(),
        "unified_document_schema.json": UnifiedDocumentResponse.model_json_schema(),
    }
    
    for filename, schema in schemas.items():
        with open(output_dir / filename, "w") as f:
            json.dump(schema, f, indent=2)
        
    print(f"Exported {len(schemas)} schemas to {output_dir}")

if __name__ == "__main__":
    export_schemas()

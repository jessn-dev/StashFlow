from pydantic import BaseModel, Field
from enum import Enum
from datetime import date
from typing import List, Optional

# --- SCHEMA GOVERNANCE WARNING ---
# This file is the CANONICAL SOURCE for financial schemas.
# Changes here should be exported using `scripts/export_schema.py`
# and then synchronized with `@stashflow/document-parser`.
# DO NOT manually edit the TypeScript versions of these schemas.
# ---------------------------------

class DocumentType(str, Enum):
    LOAN = "LOAN"
    BANK_STATEMENT = "BANK_STATEMENT"
    UNKNOWN = "UNKNOWN"

class LoanInterestType(str, Enum):
    STANDARD_AMORTIZED = "Standard Amortized"
    INTEREST_ONLY = "Interest-Only"
    ADD_ON_INTEREST = "Add-on Interest"
    FIXED_PRINCIPAL = "Fixed Principal"

class ExpenseCategory(str, Enum):
    HOUSING = "housing"
    FOOD = "food"
    TRANSPORT = "transport"
    UTILITIES = "utilities"
    HEALTHCARE = "healthcare"
    ENTERTAINMENT = "entertainment"
    EDUCATION = "education"
    PERSONAL = "personal"
    SHOPPING = "shopping"
    OTHER = "other"

class LoanExtractionSchema(BaseModel):
    """
    Schema for extracting loan details from a document.
    """
    name: str = Field(description="The name of the loan or lender")
    principal: float = Field(description="The original principal amount of the loan")
    interest_rate: float = Field(description="The annual interest rate as a percentage (e.g., 12.0)")
    installment_amount: float = Field(description="The monthly or per-period installment amount")
    duration_months: int = Field(description="The total duration of the loan in months")
    start_date: date | None = Field(default=None, description="The start date of the loan in YYYY-MM-DD format")
    currency: str = Field(default="PHP", description="The ISO 4217 currency code (e.g., PHP, USD, SGD)")
    interest_type: LoanInterestType = Field(
        default=LoanInterestType.STANDARD_AMORTIZED,
        description="The type of interest calculation"
    )
    lender: str | None = Field(default=None, description="The name of the lending institution")
    confidence: float = Field(default=0.0, ge=0, le=1, description="Confidence score from 0.0 to 1.0")
    reasoning: str = Field(default="", description="Brief explanation of the extraction results")

class TransactionExtractionItem(BaseModel):
    """
    A single transaction extracted from a bank statement.
    """
    date: str = Field(description="The transaction date in YYYY-MM-DD format")
    description: str = Field(description="The transaction description or merchant name")
    amount: float = Field(description="The transaction amount (negative for expenses, positive for income/deposits)")

class StatementExtractionSchema(BaseModel):
    """
    Structured extraction of multiple transactions from a bank statement.
    """
    account_name: str = Field(description="The name of the account or institution")
    statement_period: str = Field(description="The date range covered by the statement")
    transactions: List[TransactionExtractionItem]
    confidence: float = Field(default=0.0, ge=0, le=1, description="Confidence score from 0.0 to 1.0")
    reasoning: str = Field(default="", description="Brief explanation of the extraction results")

class UnifiedDocumentResponse(BaseModel):
    """
    Polymorphic response for unified document processing.
    """
    document_type: DocumentType = Field(description="The classified type of the document")
    loan_data: Optional[LoanExtractionSchema] = Field(None, description="Populated if document_type is LOAN")
    statement_data: Optional[StatementExtractionSchema] = Field(None, description="Populated if document_type is BANK_STATEMENT")
    confidence: float = Field(default=0.0, ge=0, le=1, description="Classification confidence")
    reasoning: str = Field(default="", description="Reasoning for classification")
    ocr_telemetry: Optional[dict] = Field(None, description="Technical metadata about the extraction process (char counts, method)")

class TransactionCategorizationSchema(BaseModel):
    """
    Schema for categorizing a bank transaction description.
    """
    category: ExpenseCategory = Field(description="The primary category for this transaction")
    confidence: float = Field(ge=0, le=1, description="Confidence score from 0.0 to 1.0")
    reasoning: str = Field(description="Brief explanation of why this category was chosen")

class TransactionRecord(BaseModel):
    """
    Input schema for spending history analysis.
    """
    date: date
    amount: float
    category: ExpenseCategory
    description: str

class AnomalySeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class AnomalyInsight(BaseModel):
    """
    Represents a single detected anomaly with AI reasoning.
    """
    category: ExpenseCategory
    severity: AnomalySeverity
    description: str = Field(description="Human-readable description of the anomaly, e.g., 'Utilities spiked by 45%'")
    recommended_action: str = Field(description="Actionable advice for the user, e.g., 'Check for leaking faucets'")

class AnomalyReportSchema(BaseModel):
    """
    Full report containing all detected spending anomalies.
    """
    anomalies: List[AnomalyInsight]

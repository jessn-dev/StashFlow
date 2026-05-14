from pydantic import BaseModel, Field, model_validator, field_validator
from enum import Enum
from datetime import date
from typing import List, Optional, Literal

# --- SCHEMA GOVERNANCE WARNING ---
# This file is the CANONICAL SOURCE for financial schemas.
# Changes here should be exported using `scripts/export_schema.py`
# and then synchronized with `@stashflow/document-parser`.
# DO NOT manually edit the TypeScript versions of these schemas.
# ---------------------------------

SUPPORTED_CURRENCIES = {'USD', 'PHP', 'SGD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'HKD', 'MYR'}

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

class Provenance(BaseModel):
    """
    Metadata linking extracted data back to its source in the document.
    """
    page: Optional[int] = Field(None, description="The 1-indexed page number where the information was found")
    snippet: Optional[str] = Field(None, description="The exact text snippet used as source context")

class SingleLoanExtractionSchema(BaseModel):
    """
    Schema for extracting loan details from a document.
    """
    name: str = Field(description="The name of the loan or lender")
    principal: float = Field(description="The original principal amount of the loan")
    interest_rate: float = Field(description="The annual interest rate as a percentage (e.g., 12.0)")
    annual_eir: Optional[float] = Field(
        default=None,
        description="The Effective Interest Rate (EIR) per year as a percentage, if explicitly stated in the document. Different from interest_rate for add-on loans."
    )
    installment_amount: Optional[float] = Field(
        default=None,
        description="The monthly or per-period installment amount. Return null if not stated explicitly per individual loan."
    )
    duration_months: Optional[int] = Field(
        default=None,
        description="Explicit loan term in months. Return null if no numeric term is stated in the document. Do NOT infer from repayment plan names or dates."
    )
    start_date: date | None = Field(default=None, description="The start date of the loan in YYYY-MM-DD format")
    currency: str = Field(default="USD", description="The ISO 4217 currency code (e.g., USD, PHP, SGD)")
    interest_type: LoanInterestType = Field(
        default=LoanInterestType.STANDARD_AMORTIZED,
        description="The type of interest calculation"
    )
    lender: str | None = Field(default=None, description="The name of the lending institution")
    confidence: float = Field(default=0.0, ge=0, le=1, description="Confidence score from 0.0 to 1.0")
    reasoning: str = Field(default="", description="Brief explanation of the extraction results")
    provenance: Optional[Provenance] = Field(None, description="Source location for the primary extracted data (page + snippet)")

    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v: str) -> str:
        normalized = v.strip().upper() if v else 'USD'
        if normalized not in SUPPORTED_CURRENCIES:
            return 'USD'  # soft fallback — never raise, LLM hallucinations are common
        return normalized

    @field_validator('interest_rate')
    @classmethod
    def validate_interest_rate(cls, v: float) -> float:
        # Soft clamp — never raise (would kill the whole extraction for one bad field).
        # Edge function resolveAnnualRate handles monthly→annual conversion separately.
        if v < 0:
            return 0.0
        if v > 100:
            return 100.0
        return v

class MultiLoanExtractionSchema(BaseModel):
    """Schema for documents containing multiple distinct loan accounts."""
    loans: List[SingleLoanExtractionSchema]
    account_number: Optional[str] = Field(
        default=None,
        description="Master account number tying all loans together, if present."
    )
    account_monthly_payment: Optional[float] = Field(
        default=None,
        description="Account-level monthly payment (e.g. 'Regular Monthly Payment Amount'). Set when the document shows a combined payment for all loans with no per-loan breakdown."
    )

class TransactionExtractionItem(BaseModel):
    """
    A single transaction extracted from a bank statement.
    """
    date: str = Field(description="The transaction date in YYYY-MM-DD format")
    description: str = Field(description="The transaction description or merchant name")
    amount: float = Field(description="The transaction amount (negative for expenses, positive for income/deposits)")
    provenance: Optional[Provenance] = Field(None, description="Source provenance for this transaction")

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
    loan_structure: Literal['single', 'multi'] = Field(
        description="'single' if one loan account, 'multi' if multiple distinct loan accounts with different account numbers. Summaries/totals of the same account are NOT separate loans."
    )
    loan_data: Optional[SingleLoanExtractionSchema] = Field(None, description="Populated when loan_structure is 'single'.")
    multi_loan_data: Optional[MultiLoanExtractionSchema] = Field(
        default=None,
        description="Populated when loan_structure is 'multi'."
    )
    statement_data: Optional[StatementExtractionSchema] = Field(None, description="Populated if document_type is BANK_STATEMENT")
    confidence: float = Field(default=0.0, ge=0, le=1, description="Classification confidence")
    reasoning: str = Field(default="", description="Reasoning for classification")
    
    # Reliability Metadata
    verification_status: Literal['verified', 'skipped', 'failed'] = Field(
        default='verified', 
        description="Status of the parallel verification/cross-check process."
    )
    user_friendly_message: Optional[str] = Field(
        None, 
        description="A human-readable message explaining reliability issues (e.g., rate limits)."
    )
    extraction_warnings: List[str] = Field(
        default_factory=list,
        description="Non-fatal warnings encountered during extraction."
    )
    ocr_telemetry: Optional[dict] = Field(None, description="Technical metadata about the extraction process (char counts, method)")

    @model_validator(mode='after')
    def validate_structure_match(self) -> 'UnifiedDocumentResponse':
        if self.document_type == DocumentType.LOAN:
            if self.loan_structure == 'single' and not self.loan_data:
                raise ValueError("loan_structure 'single' requires loan_data")
            if self.loan_structure == 'multi' and not self.multi_loan_data:
                raise ValueError("loan_structure 'multi' requires multi_loan_data")
        return self

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

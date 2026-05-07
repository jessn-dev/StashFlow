-- P1-B: Immutable audit log triggers for all financial mutations
-- Fires on INSERT, UPDATE, DELETE for incomes, expenses, loans.
-- Uses SECURITY DEFINER so the trigger can write to system_audit_logs
-- (which has service_role-only INSERT policy) regardless of the calling user's role.

CREATE OR REPLACE FUNCTION public.log_financial_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_entity_id UUID;
  v_event_type TEXT;
  v_action TEXT;
  v_metadata JSONB;
BEGIN
  -- Determine user_id and entity_id from the affected row
  IF TG_OP = 'DELETE' THEN
    v_user_id  := OLD.user_id;
    v_entity_id := OLD.id;
  ELSE
    v_user_id  := NEW.user_id;
    v_entity_id := NEW.id;
  END IF;

  -- Build event_type: '<table>.<operation>'
  v_event_type := TG_TABLE_NAME || '.' || lower(TG_OP);

  -- Human-readable action
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'created'
    WHEN 'UPDATE' THEN 'updated'
    WHEN 'DELETE' THEN 'deleted'
  END;

  -- Metadata: entity ID + operation only — no PII (no amounts, descriptions, names)
  v_metadata := jsonb_build_object(
    'entity_id',    v_entity_id,
    'entity_type',  TG_TABLE_NAME,
    'operation',    TG_OP
  );

  -- Append currency for reference without storing the amount
  IF TG_OP != 'DELETE' AND NEW.currency IS NOT NULL THEN
    v_metadata := v_metadata || jsonb_build_object('currency', NEW.currency);
  END IF;

  INSERT INTO public.system_audit_logs (user_id, event_type, action, metadata, severity)
  VALUES (v_user_id, v_event_type, v_action, v_metadata, 'info');

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─── incomes ──────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_incomes ON public.incomes;
CREATE TRIGGER trg_audit_incomes
  AFTER INSERT OR UPDATE OR DELETE ON public.incomes
  FOR EACH ROW EXECUTE FUNCTION public.log_financial_mutation();

-- ─── expenses ─────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_expenses ON public.expenses;
CREATE TRIGGER trg_audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.log_financial_mutation();

-- ─── loans ────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_loans ON public.loans;
CREATE TRIGGER trg_audit_loans
  AFTER INSERT OR UPDATE OR DELETE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.log_financial_mutation();

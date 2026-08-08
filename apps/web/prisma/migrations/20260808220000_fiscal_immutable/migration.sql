-- VERI*FACTU: FiscalRecord rows are append-only (no UPDATE/DELETE)
CREATE OR REPLACE FUNCTION prevent_fiscal_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Fiscal records are immutable. Modification and deletion are strictly prohibited by VERI*FACTU regulations.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_fiscal_immutability ON "FiscalRecord";

CREATE TRIGGER check_fiscal_immutability
BEFORE UPDATE OR DELETE ON "FiscalRecord"
FOR EACH ROW EXECUTE FUNCTION prevent_fiscal_modification();

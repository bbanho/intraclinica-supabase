-- Add optional procedure_type_id to appointment for billing and stock deduction tracking
ALTER TABLE appointment ADD COLUMN IF NOT EXISTS procedure_type_id uuid REFERENCES procedure_type(id) ON DELETE SET NULL;

COMMENT ON COLUMN appointment.procedure_type_id IS 'Optional procedure planned for this appointment. Used for stock deduction (via perform_procedure RPC) and billing reference.';

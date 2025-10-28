-- ╔════════════════════════════════════════════════════════════════════╗
-- ║           PER-PROJECT BILLING MIGRATION                            ║
-- ║                                                                    ║
-- ║  Converts from monthly subscription to per-project payment         ║
-- ║  Run this in Supabase SQL Editor                                  ║
-- ╚════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════
-- SECTION 1: ADD PAYMENT STATUS TO PROJECTS
-- ════════════════════════════════════════════════════════════════════

-- Add columns to track if project is paid
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_id UUID,
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 5.00;

-- Add foreign key constraint
ALTER TABLE projects
ADD CONSTRAINT projects_payment_id_fkey 
FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_is_paid ON projects(is_paid);
CREATE INDEX IF NOT EXISTS idx_projects_payment_id ON projects(payment_id);

COMMENT ON COLUMN projects.is_paid IS 'Whether this project has been paid for and published';
COMMENT ON COLUMN projects.paid_at IS 'Timestamp when project was paid for';
COMMENT ON COLUMN projects.payment_id IS 'Reference to payment record for this project';
COMMENT ON COLUMN projects.price IS 'Price to publish this project (default RM 5.00)';

-- ════════════════════════════════════════════════════════════════════
-- SECTION 2: LINK PAYMENTS TO PROJECTS
-- ════════════════════════════════════════════════════════════════════

-- Add project_id to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS project_id UUID;

-- Add foreign key constraint
ALTER TABLE payments
ADD CONSTRAINT payments_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);

COMMENT ON COLUMN payments.project_id IS 'The specific project this payment is for (per-project billing)';

-- ════════════════════════════════════════════════════════════════════
-- SECTION 3: UPDATE EXISTING DATA (OPTIONAL)
-- ════════════════════════════════════════════════════════════════════

-- Mark all existing projects from paid users as paid (one-time migration)
-- This ensures existing paid users keep access to their projects
UPDATE projects p
SET 
  is_paid = true,
  paid_at = NOW()
FROM user_subscriptions us
WHERE 
  p.user_id = us.user_id 
  AND us.status = 'active'
  AND p.is_paid = false;

-- ════════════════════════════════════════════════════════════════════
-- SECTION 4: CREATE HELPER FUNCTION
-- ════════════════════════════════════════════════════════════════════

-- Function to mark project as paid after successful payment
CREATE OR REPLACE FUNCTION mark_project_paid(
  p_project_id UUID,
  p_payment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update project to mark as paid
  UPDATE projects
  SET 
    is_paid = true,
    paid_at = NOW(),
    payment_id = p_payment_id
  WHERE id = p_project_id;
  
  -- Update payment to link to project
  UPDATE payments
  SET project_id = p_project_id
  WHERE id = p_payment_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

COMMENT ON FUNCTION mark_project_paid IS 'Marks a project as paid and links payment record (called by webhook)';

-- ════════════════════════════════════════════════════════════════════
-- SECTION 5: ADD ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════════

-- Public projects: Anyone can view paid projects
CREATE POLICY "Anyone can view paid projects" ON projects
  FOR SELECT
  USING (is_paid = true);

-- Users can view their own projects (paid or unpaid)
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only edit their own unpaid projects
CREATE POLICY "Users can edit their own unpaid projects" ON projects
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Note: Update existing policies if they conflict

-- ════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ════════════════════════════════════════════════════════════════════

-- Check if columns were added successfully
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND column_name IN ('is_paid', 'paid_at', 'payment_id', 'price')
ORDER BY column_name;

-- Check payments table for project_id column
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments' 
  AND column_name = 'project_id';

-- Count paid vs unpaid projects
SELECT 
  is_paid,
  COUNT(*) as count
FROM projects
GROUP BY is_paid;

-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK (if needed)
-- ════════════════════════════════════════════════════════════════════
/*
-- Uncomment to rollback:

DROP FUNCTION IF EXISTS mark_project_paid(UUID, UUID);

ALTER TABLE payments DROP COLUMN IF EXISTS project_id;

ALTER TABLE projects DROP COLUMN IF EXISTS is_paid;
ALTER TABLE projects DROP COLUMN IF EXISTS paid_at;
ALTER TABLE projects DROP COLUMN IF EXISTS payment_id;
ALTER TABLE projects DROP COLUMN IF EXISTS price;

DROP INDEX IF EXISTS idx_projects_is_paid;
DROP INDEX IF EXISTS idx_projects_payment_id;
DROP INDEX IF EXISTS idx_payments_project_id;
*/

-- SQL commands for updating the database with approval system

-- Add role column to admins table
ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'Standard';
COMMENT ON COLUMN admins.role IS 'Admin role: Standard, Supervisor, Accountant, Director';

-- Add approval fields to overtime_entries table
ALTER TABLE overtime_entries ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'Pending';
ALTER TABLE overtime_entries ADD COLUMN approved_by UUID REFERENCES admins(id);
ALTER TABLE overtime_entries ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE overtime_entries ADD COLUMN rejected_by UUID REFERENCES admins(id);
ALTER TABLE overtime_entries ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE overtime_entries ADD COLUMN rejection_reason TEXT;
ALTER TABLE overtime_entries ADD COLUMN last_edited_by UUID REFERENCES admins(id);
ALTER TABLE overtime_entries ADD COLUMN last_edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE overtime_entries ADD COLUMN created_by UUID REFERENCES admins(id);
ALTER TABLE overtime_entries ADD COLUMN category_a_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE overtime_entries ADD COLUMN category_c_amount DECIMAL(10, 2) DEFAULT 0;

-- Create indexes for improved query performance
CREATE INDEX overtime_entries_approval_status_idx ON overtime_entries(approval_status);
CREATE INDEX overtime_entries_approved_by_idx ON overtime_entries(approved_by);
CREATE INDEX overtime_entries_created_by_idx ON overtime_entries(created_by);

-- Update existing entries to have amounts calculated
UPDATE overtime_entries 
SET 
  category_a_amount = COALESCE(category_a_hours, 0) * 2,
  category_c_amount = COALESCE(category_c_hours, 0) * 3;

-- Add comments for documentation
COMMENT ON COLUMN overtime_entries.approval_status IS 'Pending, Supervisor, Accountant, Approved, Rejected';
COMMENT ON COLUMN overtime_entries.approved_by IS 'Admin who approved this entry';
COMMENT ON COLUMN overtime_entries.created_by IS 'Admin who created this entry';
COMMENT ON COLUMN overtime_entries.last_edited_by IS 'Admin who last edited this entry';
COMMENT ON COLUMN overtime_entries.category_a_amount IS 'Category A amount (hours * 2)';
COMMENT ON COLUMN overtime_entries.category_c_amount IS 'Category C amount (hours * 3)';

-- Create a view for monthly summary that includes approval status
CREATE OR REPLACE VIEW monthly_worker_summary AS
SELECT 
  worker_id,
  EXTRACT(MONTH FROM date) as month,
  EXTRACT(YEAR FROM date) as year,
  SUM(COALESCE(category_a_hours, 0)) as category_a_hours,
  SUM(COALESCE(category_c_hours, 0)) as category_c_hours,
  SUM(COALESCE(category_a_amount, 0)) as category_a_amount,
  SUM(COALESCE(category_c_amount, 0)) as category_c_amount,
  COUNT(CASE WHEN transportation = true THEN 1 END) as transportation_days,
  SUM(CASE WHEN transportation = true THEN COALESCE(transportation_cost, 0) ELSE 0 END) as transportation_cost,
  ARRAY_AGG(DISTINCT approval_status) as approval_statuses
FROM overtime_entries
GROUP BY worker_id, EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date);

-- Add last_edited_at column to risk_entries table
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;

-- Add approval columns to risk_entries table
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Pending';
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add RLS policies for approval
-- Allow read access to all authenticated users (adjust as needed)
DROP POLICY IF EXISTS "Allow authenticated users to view risk entries" ON risk_entries;
CREATE POLICY "Allow authenticated users to view risk entries" ON risk_entries FOR SELECT TO authenticated USING (true);

-- Allow inserts by authenticated users
DROP POLICY IF EXISTS "Allow authenticated users to insert risk entries" ON risk_entries;
CREATE POLICY "Allow authenticated users to insert risk entries" ON risk_entries FOR INSERT TO authenticated WITH CHECK (true);

-- Allow updates by authenticated users based on their role and approval status
DROP POLICY IF EXISTS "Allow standard/district head to update pending risk entries" ON risk_entries;
CREATE POLICY "Allow standard/district head to update pending risk entries" ON risk_entries FOR UPDATE TO authenticated USING (auth.uid() IN ( SELECT id FROM users WHERE role = 'Standard' OR role = 'District_Head' )) WITH CHECK (approval_status = 'Pending');

DROP POLICY IF EXISTS "Allow supervisor/rdm to update standard approved risk entries" ON risk_entries;
CREATE POLICY "Allow supervisor/rdm to update standard approved risk entries" ON risk_entries FOR UPDATE TO authenticated USING (auth.uid() IN ( SELECT id FROM users WHERE role = 'Supervisor' OR role = 'RDM' )) WITH CHECK (approval_status = 'Standard');

-- Add policies for approving/rejecting based on role and current status
DROP POLICY IF EXISTS "Allow district head to approve pending risk entries" ON risk_entries;
CREATE POLICY "Allow district head to approve pending risk entries" ON risk_entries FOR UPDATE TO authenticated USING (auth.uid() IN ( SELECT id FROM users WHERE role = 'Standard' OR role = 'District_Head' ) AND approval_status = 'Pending') WITH CHECK (approval_status = 'Standard');

DROP POLICY IF EXISTS "Allow supervisor/rdm to approve standard risk entries" ON risk_entries;
CREATE POLICY "Allow supervisor/rdm to approve standard risk entries" ON risk_entries FOR UPDATE TO authenticated USING (auth.uid() IN ( SELECT id FROM users WHERE role = 'Supervisor' OR role = 'RDM' ) AND approval_status = 'Standard') WITH CHECK (approval_status = 'Supervisor');

DROP POLICY IF EXISTS "Allow director/rcm to approve supervisor risk entries" ON risk_entries;
CREATE POLICY "Allow director/rcm to approve supervisor risk entries" ON risk_entries FOR UPDATE TO authenticated USING (auth.uid() IN ( SELECT id FROM users WHERE role = 'Director' OR role = 'RCM' ) AND approval_status = 'Supervisor') WITH CHECK (approval_status = 'Approved');

-- Add policy for rejecting by authorized roles (Standard/District Head, Supervisor/RDM, Director/RCM)
DROP POLICY IF EXISTS "Allow authorized roles to reject risk entries" ON risk_entries;
CREATE POLICY "Allow authorized roles to reject risk entries" ON risk_entries FOR UPDATE TO authenticated USING (auth.uid() IN ( SELECT id FROM users WHERE role IN ('Standard', 'District_Head', 'Supervisor', 'RDM', 'Director', 'RCM') ) AND approval_status != 'Rejected') WITH CHECK (approval_status = 'Rejected');

-- Allow deletes by authenticated users based on their role and approval status (e.g., only pending or rejected for Standard/District Head)
DROP POLICY IF EXISTS "Allow standard/district head to delete pending or rejected risk entries" ON risk_entries;
CREATE POLICY "Allow standard/district head to delete pending or rejected risk entries" ON risk_entries FOR DELETE TO authenticated USING (auth.uid() IN ( SELECT id FROM users WHERE role = 'Standard' OR role = 'District_Head' ) AND (approval_status = 'Pending' OR approval_status = 'Rejected'));

-- Run this script in your database SQL editor to add the approval system. 
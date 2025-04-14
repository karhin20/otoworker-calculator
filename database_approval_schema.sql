-- SQL commands to set up the approval workflow schema

-- Make sure the admin table has the role column
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Standard';

-- Create indexes on the admins table
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Alter overtime_entries table to add approval fields
ALTER TABLE overtime_entries ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'Pending';
ALTER TABLE overtime_entries ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES admins(id);
ALTER TABLE overtime_entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE overtime_entries ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES admins(id);
ALTER TABLE overtime_entries ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE overtime_entries ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE overtime_entries ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES admins(id);
ALTER TABLE overtime_entries ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE overtime_entries ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admins(id);

-- Add amount columns for overtime entries
ALTER TABLE overtime_entries ADD COLUMN IF NOT EXISTS category_a_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE overtime_entries ADD COLUMN IF NOT EXISTS category_c_amount DECIMAL(10, 2) DEFAULT 0;

-- Update existing entries to calculate amounts
UPDATE overtime_entries 
SET 
  category_a_amount = COALESCE(category_a_hours, 0) * 2,
  category_c_amount = COALESCE(category_c_hours, 0) * 3
WHERE 
  category_a_amount IS NULL OR category_c_amount IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_overtime_entries_approval_status ON overtime_entries(approval_status);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_worker_id ON overtime_entries(worker_id);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_date ON overtime_entries(date);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_approved_by ON overtime_entries(approved_by);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_created_by ON overtime_entries(created_by);

-- Create a view for worker summary with approval info
CREATE OR REPLACE VIEW worker_summary_with_approval AS
SELECT 
  w.id AS worker_id,
  w.name,
  w.staff_id,
  w.grade,
  COALESCE(SUM(oe.category_a_hours), 0) AS category_a_hours,
  COALESCE(SUM(oe.category_c_hours), 0) AS category_c_hours,
  COALESCE(SUM(oe.category_a_amount), 0) AS category_a_amount,
  COALESCE(SUM(oe.category_c_amount), 0) AS category_c_amount,
  COUNT(CASE WHEN oe.transportation = true THEN 1 END) AS transportation_days,
  COALESCE(SUM(CASE WHEN oe.transportation = true THEN oe.transportation_cost ELSE 0 END), 0) AS transportation_cost,
  array_agg(DISTINCT oe.approval_status) AS approval_statuses,
  COUNT(DISTINCT oe.id) AS total_entries
FROM 
  workers w
LEFT JOIN 
  overtime_entries oe ON w.id = oe.worker_id
WHERE 
  oe.date IS NULL OR (oe.date >= date_trunc('month', current_date) AND oe.date < date_trunc('month', current_date) + interval '1 month')
GROUP BY 
  w.id, w.name, w.staff_id, w.grade;

-- Add appropriate comments
COMMENT ON COLUMN admins.role IS 'Admin role: Standard, Supervisor, Accountant, Director';
COMMENT ON COLUMN overtime_entries.approval_status IS 'Approval status: Pending, Supervisor, Accountant, Approved, Rejected';
COMMENT ON COLUMN overtime_entries.approved_by IS 'Reference to the admin who approved this entry';
COMMENT ON COLUMN overtime_entries.rejected_by IS 'Reference to the admin who rejected this entry';
COMMENT ON COLUMN overtime_entries.category_a_amount IS 'Calculated amount for Category A hours (hours * 2)';
COMMENT ON COLUMN overtime_entries.category_c_amount IS 'Calculated amount for Category C hours (hours * 3)';

-- Run this script in your Supabase SQL editor to set up the approval workflow schema. 
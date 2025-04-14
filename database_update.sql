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

-- Run this script in your database SQL editor to add the approval system. 
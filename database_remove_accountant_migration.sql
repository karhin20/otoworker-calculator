-- Migration to remove Accountant role from approval workflow

-- 1. Update comments to reflect new approval flow
COMMENT ON COLUMN overtime_entries.approval_status IS 'Approval status: Pending, Standard, Supervisor, Approved, Rejected';

-- 2. Update any entries that are currently at Accountant status to be at Supervisor status
UPDATE overtime_entries 
SET approval_status = 'Supervisor'
WHERE approval_status = 'Accountant';

-- 3. Update any views or stored procedures that rely on Accountant status
-- Refresh the worker_summary_with_approval view
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
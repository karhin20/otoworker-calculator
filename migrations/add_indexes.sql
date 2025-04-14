-- Add indexes to improve query performance
-- Index for filtering by worker_id
CREATE INDEX IF NOT EXISTS idx_overtime_entries_worker_id ON overtime_entries (worker_id);

-- Index for filtering by date
CREATE INDEX IF NOT EXISTS idx_overtime_entries_date ON overtime_entries (date);

-- Index for filtering by approval_status
CREATE INDEX IF NOT EXISTS idx_overtime_entries_approval_status ON overtime_entries (approval_status);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_overtime_entries_worker_date ON overtime_entries (worker_id, date);

-- Composite index for approval workflows
CREATE INDEX IF NOT EXISTS idx_overtime_entries_worker_approval ON overtime_entries (worker_id, approval_status);

-- Index for risk_entries table
CREATE INDEX IF NOT EXISTS idx_risk_entries_worker_id ON risk_entries (worker_id);
CREATE INDEX IF NOT EXISTS idx_risk_entries_date ON risk_entries (date);

-- Index for clock_entries table
CREATE INDEX IF NOT EXISTS idx_clock_entries_worker_id ON clock_entries (worker_id);
CREATE INDEX IF NOT EXISTS idx_clock_entries_clock_in_time ON clock_entries (clock_in_time); 
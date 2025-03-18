-- SQL commands for setting up risk management tables in Supabase

-- Create risk_entries table
CREATE TABLE risk_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  location TEXT NOT NULL,
  size_depth TEXT NOT NULL,
  remarks TEXT,
  rate DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT valid_risk_date CHECK (date <= CURRENT_DATE)
);

-- Add indexes for improved query performance
CREATE INDEX risk_entries_worker_id_idx ON risk_entries(worker_id);
CREATE INDEX risk_entries_date_idx ON risk_entries(date);

-- Set up Row Level Security (RLS) policies
ALTER TABLE risk_entries ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Authenticated users can read risk entries"
  ON risk_entries
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert risk entries"
  ON risk_entries
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add comment for documentation
COMMENT ON TABLE risk_entries IS 'Stores risk management entries for workers';

-- Run these commands in your Supabase SQL editor to set up the tables for risk management.
-- Make sure the workers table already exists before running this script. 
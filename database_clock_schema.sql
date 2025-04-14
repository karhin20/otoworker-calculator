-- Create the clock_events table
CREATE TABLE clock_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES workers(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('clock_in', 'clock_out')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    location_latitude DOUBLE PRECISION NOT NULL,
    location_longitude DOUBLE PRECISION NOT NULL,
    location_address TEXT,
    source TEXT DEFAULT 'web_app',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes to improve query performance
CREATE INDEX idx_clock_events_worker_id ON clock_events(worker_id);
CREATE INDEX idx_clock_events_timestamp ON clock_events(timestamp);
CREATE INDEX idx_clock_events_event_type ON clock_events(event_type);

-- Add combined index for worker_id and timestamp for faster lookups
CREATE INDEX idx_clock_events_worker_timestamp ON clock_events(worker_id, timestamp);

-- Create a view to get the latest clock event for each worker
CREATE OR REPLACE VIEW latest_clock_events AS
SELECT DISTINCT ON (worker_id) 
    worker_id,
    event_type,
    timestamp,
    location_latitude,
    location_longitude,
    location_address
FROM clock_events
ORDER BY worker_id, timestamp DESC;

-- Create function to calculate work hours between clock in and out
CREATE OR REPLACE FUNCTION calculate_work_hours(
    p_worker_id UUID,
    p_date DATE
)
RETURNS FLOAT AS $$
DECLARE
    v_total_hours FLOAT := 0;
    v_clock_in TIMESTAMPTZ;
    v_clock_out TIMESTAMPTZ;
    v_pair_record RECORD;
BEGIN
    -- Get all clock in/out pairs for the worker on the specified date
    FOR v_pair_record IN (
        WITH ordered_events AS (
            SELECT 
                id,
                event_type, 
                timestamp,
                LAG(event_type) OVER (ORDER BY timestamp) AS prev_event,
                LAG(timestamp) OVER (ORDER BY timestamp) AS prev_timestamp
            FROM clock_events
            WHERE 
                worker_id = p_worker_id 
                AND DATE(timestamp) = p_date
            ORDER BY timestamp
        )
        SELECT 
            timestamp AS clock_out_time,
            prev_timestamp AS clock_in_time
        FROM ordered_events
        WHERE 
            event_type = 'clock_out' 
            AND prev_event = 'clock_in'
    ) LOOP
        v_clock_in := v_pair_record.clock_in_time;
        v_clock_out := v_pair_record.clock_out_time;
        
        -- Calculate hours between clock in and out
        v_total_hours := v_total_hours + EXTRACT(EPOCH FROM (v_clock_out - v_clock_in)) / 3600;
    END LOOP;
    
    RETURN v_total_hours;
END;
$$ LANGUAGE plpgsql;

-- Create a function to convert clock events into overtime entries
CREATE OR REPLACE FUNCTION generate_overtime_from_clock(
    p_worker_id UUID,
    p_date DATE
)
RETURNS VOID AS $$
DECLARE
    v_total_hours FLOAT;
    v_category TEXT;
    v_category_a_hours FLOAT := 0;
    v_category_c_hours FLOAT := 0;
    v_first_clock_in TIMESTAMPTZ;
    v_last_clock_out TIMESTAMPTZ;
    v_entry_time TEXT;
    v_exit_time TEXT;
    v_regular_hours FLOAT := 8.0; -- Standard work day
    v_date_of_week INTEGER;
BEGIN
    -- Calculate total hours worked
    v_total_hours := calculate_work_hours(p_worker_id, p_date);
    
    -- Skip if no hours logged
    IF v_total_hours <= 0 THEN
        RETURN;
    END IF;
    
    -- Determine category based on day of week
    v_date_of_week := EXTRACT(DOW FROM p_date);
    IF v_date_of_week IN (0, 6) THEN -- Weekend (Sunday=0, Saturday=6)
        v_category := 'C';
    ELSE
        v_category := 'A';
    END IF;
    
    -- Calculate overtime hours
    IF v_category = 'A' THEN
        v_category_a_hours := GREATEST(v_total_hours - v_regular_hours, 0);
    ELSE
        v_category_c_hours := v_total_hours;
    END IF;
    
    -- Get first clock in and last clock out times
    SELECT MIN(timestamp) INTO v_first_clock_in
    FROM clock_events 
    WHERE worker_id = p_worker_id 
      AND DATE(timestamp) = p_date
      AND event_type = 'clock_in';
      
    SELECT MAX(timestamp) INTO v_last_clock_out
    FROM clock_events 
    WHERE worker_id = p_worker_id 
      AND DATE(timestamp) = p_date
      AND event_type = 'clock_out';
      
    -- Format times as HH:MM
    v_entry_time := TO_CHAR(v_first_clock_in AT TIME ZONE 'UTC', 'HH24:MI');
    v_exit_time := TO_CHAR(v_last_clock_out AT TIME ZONE 'UTC', 'HH24:MI');
    
    -- Insert or update overtime entry
    INSERT INTO overtime_entries (
        worker_id, 
        date, 
        entry_time, 
        exit_time, 
        category, 
        category_a_hours, 
        category_c_hours, 
        automatically_generated
    )
    VALUES (
        p_worker_id,
        p_date,
        v_entry_time,
        v_exit_time,
        v_category,
        v_category_a_hours,
        v_category_c_hours,
        TRUE
    )
    ON CONFLICT (worker_id, date) 
    DO UPDATE SET
        entry_time = v_entry_time,
        exit_time = v_exit_time,
        category = v_category,
        category_a_hours = v_category_a_hours,
        category_c_hours = v_category_c_hours,
        automatically_generated = TRUE,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Add automatically_generated column to overtime_entries if not exists
ALTER TABLE overtime_entries ADD COLUMN IF NOT EXISTS automatically_generated BOOLEAN DEFAULT FALSE;

-- Create a trigger to automatically generate overtime entries when a clock event is inserted
CREATE OR REPLACE FUNCTION trigger_generate_overtime()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM generate_overtime_from_clock(NEW.worker_id, DATE(NEW.timestamp));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clock_event_overtime_trigger
AFTER INSERT ON clock_events
FOR EACH ROW
EXECUTE FUNCTION trigger_generate_overtime(); 
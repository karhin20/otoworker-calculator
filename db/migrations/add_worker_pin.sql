-- Add PIN column to workers table
ALTER TABLE workers ADD COLUMN pin VARCHAR(255);

-- Create a trigger that prevents PIN from being null on new inserts
CREATE OR REPLACE FUNCTION enforce_pin_on_insert() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pin IS NULL THEN
    RAISE EXCEPTION 'PIN cannot be null for new workers';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_workers_enforce_pin
BEFORE INSERT ON workers
FOR EACH ROW
EXECUTE FUNCTION enforce_pin_on_insert();

-- Add comment explaining PIN field
COMMENT ON COLUMN workers.pin IS 'Encrypted 6-digit PIN for worker authentication'; 
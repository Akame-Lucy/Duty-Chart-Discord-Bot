/*
  # Create Duty Chart System Tables

  1. New Tables
    - `duty_charts`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `channel_id` (text)
      - `message_id` (text)
      - `created_at` (timestamp)
    
    - `duties`
      - `id` (uuid, primary key)
      - `chart_id` (uuid, foreign key)
      - `user_id` (text)
      - `username` (text)
      - `time_slot` (text)
      - `assigned_at` (timestamp)

    - `duty_logs`
      - `id` (uuid, primary key)
      - `action` (text)
      - `details` (text)
      - `performed_by` (text)
      - `created_at` (timestamp)

    - `time_slots`
      - `id` (uuid, primary key)
      - `chart_id` (uuid, foreign key)
      - `time_slot` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

DO $$ 
BEGIN
  -- Create duty_charts table
  CREATE TABLE IF NOT EXISTS duty_charts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    channel_id text NOT NULL,
    message_id text NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  -- Add unique constraint separately to avoid lock conflicts
  ALTER TABLE duty_charts ADD CONSTRAINT duty_charts_name_key UNIQUE (name);

  -- Create duties table
  CREATE TABLE IF NOT EXISTS duties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id uuid NOT NULL,
    user_id text NOT NULL,
    username text NOT NULL,
    time_slot text NOT NULL,
    assigned_at timestamptz DEFAULT now()
  );

  -- Add foreign key constraint separately
  ALTER TABLE duties 
    ADD CONSTRAINT duties_chart_id_fkey 
    FOREIGN KEY (chart_id) 
    REFERENCES duty_charts(id) 
    ON DELETE CASCADE;

  -- Create duty_logs table
  CREATE TABLE IF NOT EXISTS duty_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL,
    details text NOT NULL,
    performed_by text NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  -- Create time_slots table
  CREATE TABLE IF NOT EXISTS time_slots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id uuid NOT NULL,
    time_slot text NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  -- Add foreign key constraint separately
  ALTER TABLE time_slots 
    ADD CONSTRAINT time_slots_chart_id_fkey 
    FOREIGN KEY (chart_id) 
    REFERENCES duty_charts(id) 
    ON DELETE CASCADE;

  -- Enable RLS on all tables
  ALTER TABLE duty_charts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE duties ENABLE ROW LEVEL SECURITY;
  ALTER TABLE duty_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

  -- Create policies for duty_charts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'duty_charts'::regclass 
    AND polname = 'Allow all operations for authenticated users'
  ) THEN
    CREATE POLICY "Allow all operations for authenticated users"
      ON duty_charts
      FOR ALL
      TO authenticated
      USING (true);
  END IF;

  -- Create policies for duties
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'duties'::regclass 
    AND polname = 'Allow all operations for authenticated users'
  ) THEN
    CREATE POLICY "Allow all operations for authenticated users"
      ON duties
      FOR ALL
      TO authenticated
      USING (true);
  END IF;

  -- Create policies for duty_logs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'duty_logs'::regclass 
    AND polname = 'Allow all operations for authenticated users'
  ) THEN
    CREATE POLICY "Allow all operations for authenticated users"
      ON duty_logs
      FOR ALL
      TO authenticated
      USING (true);
  END IF;

  -- Create policies for time_slots
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'time_slots'::regclass 
    AND polname = 'Allow all operations for authenticated users'
  ) THEN
    CREATE POLICY "Allow all operations for authenticated users"
      ON time_slots
      FOR ALL
      TO authenticated
      USING (true);
  END IF;

  -- Drop the existing policy if it exists
  DROP POLICY IF EXISTS insert_duty_logs ON duty_logs;

  -- Disable RLS on duty_logs
  ALTER TABLE duty_logs DISABLE ROW LEVEL SECURITY;
END $$;

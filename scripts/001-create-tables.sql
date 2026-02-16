-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  plain_password TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  access_level INTEGER NOT NULL DEFAULT 1,
  admin_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  date TEXT,
  receipt_number TEXT,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  store_name TEXT,
  image_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  card_firma TEXT,
  avans_decont TEXT,
  observatii_lucrare TEXT,
  modified_by TEXT,
  modified_by_color TEXT,
  modified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create vacations table
CREATE TABLE IF NOT EXISTS vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'legal',
  days INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create vacation_settings table
CREATE TABLE IF NOT EXISTS vacation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL DEFAULT 2026,
  total_allocated INTEGER NOT NULL DEFAULT 21,
  an_anterior INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, year)
);

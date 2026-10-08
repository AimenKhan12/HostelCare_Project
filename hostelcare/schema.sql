-- Run this ONCE in the Neon SQL Editor. It creates the 4 tables.

-- Everyone who can log in: resident, staff or admin
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,                       -- never the real password
  role TEXT NOT NULL CHECK (role IN ('resident','staff','admin')),
  category TEXT,                                     -- only for staff (Electrical, Plumbing...)
  room TEXT,                                         -- only for residents
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Complaints made by residents
CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL PRIMARY KEY,
  resident_id INT REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  visit_time TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  assigned_to INT REFERENCES users(id) ON DELETE SET NULL,   -- the staff member
  rating INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alerts shown on the bell icon
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notice board posts by the admin
CREATE TABLE IF NOT EXISTS notices (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

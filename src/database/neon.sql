-- =====================================================================
-- Ru'sAuth: Neon (PostgreSQL) schema
-- Neon Console -> SQL Editor তে পুরোটা পেস্ট করে একবার Run করুন।
-- সব স্টেটমেন্ট একাধিকবার চালালেও ক্ষতি নেই (IF NOT EXISTS)।
-- এরপর অ্যাডমিন তৈরির জন্য seed-admin.sql চালান।
-- =====================================================================

-- ১. enum টাইপ

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'otp_type') THEN
    CREATE TYPE otp_type AS ENUM (
      'ACCOUNT_VERIFICATION',
      'PASSWORD_RESET',
      'ADD_PASSWORD',
      'CHANGE_PASSWORD'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_type') THEN
    CREATE TYPE provider_type AS ENUM ('CREDENTIALS', 'GOOGLE');
  END IF;
END
$$;

-- ২. ব্যবহারকারী

CREATE TABLE IF NOT EXISTS users (
  uid varchar(50) PRIMARY KEY,

  username varchar(255) NOT NULL,
  email varchar(255) UNIQUE NOT NULL,

  profile_image_public_url text DEFAULT NULL,
  profile_image_public_id text DEFAULT NULL,

  password_hash varchar(255) DEFAULT NULL,
  google_id varchar(255) UNIQUE,
  provider provider_type NOT NULL,
  is_verified boolean DEFAULT false NOT NULL,

  is_account_deleted boolean DEFAULT false NOT NULL,
  deleted_at timestamptz,

  created_at timestamptz DEFAULT now() NOT NULL,
  last_login timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (LOWER(email));

-- username শুধু দেখানোর নাম, তাই এর ওপর কোনো unique index নেই (একই নামে একাধিক ব্যবহারকারী থাকতে পারে)

-- ৩. ব্যবহারকারীর লগইন সেশন

CREATE TABLE IF NOT EXISTS sessions (
  session_uid varchar(50) PRIMARY KEY,

  user_id varchar(50) NOT NULL
    REFERENCES users(uid) ON DELETE CASCADE,

  refresh_token_hash text UNIQUE NOT NULL,
  is_revoked boolean DEFAULT false NOT NULL,
  revoked_at timestamptz,

  device_type varchar(50),
  browser_name varchar(50),
  os_name varchar(50),
  ip_address inet,

  device_fingerprint varchar(64),

  last_used_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

-- ৪. OTP (সফলভাবে ব্যবহারের সাথে সাথে মুছে যায়)

CREATE TABLE IF NOT EXISTS otp_tokens (
  otp_uid varchar(50) PRIMARY KEY,

  user_id varchar(50) NOT NULL
    REFERENCES users(uid) ON DELETE CASCADE,

  email varchar(255) NOT NULL,
  code_hash text NOT NULL,
  type otp_type NOT NULL,

  attempts integer DEFAULT 0 NOT NULL,

  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS otp_tokens_user_type_key ON otp_tokens (user_id, type);

-- ৫. পাসওয়ার্ড যোগ/বদলের একবার-ব্যবহারযোগ্য অনুমতি

CREATE TABLE IF NOT EXISTS password_update_grants (
  grant_uid varchar(50) PRIMARY KEY,

  user_id varchar(50) NOT NULL UNIQUE
    REFERENCES users(uid) ON DELETE CASCADE,

  action varchar(10) NOT NULL CHECK (action IN ('ADD', 'CHANGE')),
  session_uid varchar(50) NOT NULL,

  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL
);

-- ৬. অ্যাডমিন (সর্বোচ্চ একজন)

CREATE TABLE IF NOT EXISTS admins (
  email varchar(255) PRIMARY KEY,

  username varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,

  singleton boolean DEFAULT true UNIQUE,

  created_at timestamptz DEFAULT now() NOT NULL,
  last_login timestamptz
);

-- ৭. অ্যাডমিন সেশন

CREATE TABLE IF NOT EXISTS admin_sessions (
  session_uid varchar(50) PRIMARY KEY,

  admin_email varchar(255) NOT NULL
    REFERENCES admins(email) ON DELETE CASCADE,

  refresh_token_hash text UNIQUE NOT NULL,
  is_revoked boolean DEFAULT false NOT NULL,
  revoked_at timestamptz,

  device_type varchar(50),
  browser_name varchar(50),
  os_name varchar(50),

  ip_address inet,

  device_fingerprint varchar(64),

  last_used_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_sessions_email_idx ON admin_sessions (admin_email);

-- ৮. অথেন্টিকেশন rate limit

CREATE TABLE IF NOT EXISTS rate_limits (
  scope varchar(10) NOT NULL CHECK (scope IN ('ADMIN', 'USER')),
  key_hash char(64) NOT NULL,

  request_count integer DEFAULT 0 NOT NULL,
  window_started_at timestamptz DEFAULT now() NOT NULL,
  blocked_until timestamptz,

  PRIMARY KEY (scope, key_hash)
);

-- 1. Drop all tables created for Ru'sAuth
DROP TABLE IF EXISTS
    admin_sessions,
    sessions,
    otp_tokens,
    password_update_grants,
    rate_limits,
    admins,
    users
CASCADE;

-- 2. Drop custom enum types
DROP TYPE IF EXISTS otp_type CASCADE;
DROP TYPE IF EXISTS provider_type CASCADE;
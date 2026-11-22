CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Remove previous any admin
DELETE FROM admins
WHERE
  email <> lower(trim('write your admin email here'));

-- Admin creation
INSERT INTO
  admins (email, username, password_hash)
VALUES
  (
    lower(trim('write your admin email here')), -- Admin Email
    'write your admin name here', -- Admin Name
    crypt ('write your admin password here*', gen_salt ('bf', 12)) -- Admin Password
  ) ON CONFLICT (email) DO
UPDATE
SET
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash;

-- Show result
SELECT
  email,
  username,
  created_at
FROM
  admins;
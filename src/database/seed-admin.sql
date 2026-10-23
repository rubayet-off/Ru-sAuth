CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- আগের (আলাদা ইমেইলের) অ্যাডমিন থাকলে সরানো হয়
DELETE FROM admins
WHERE
  email <> lower(trim('rubayet.off@gmail.com'));

-- অ্যাডমিন তৈরি বা হালনাগাদ
INSERT INTO
  admins (email, username, password_hash)
VALUES
  (
    lower(trim('rubayet.off@gmail.com')), -- অ্যাডমিনের ইমেইল
    'Rowshan Rubayet', -- অ্যাডমিনের নাম
    crypt ('calipso1*', gen_salt ('bf', 12)) -- অ্যাডমিনের পাসওয়ার্ড
  ) ON CONFLICT (email) DO
UPDATE
SET
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash;

-- ফলাফল দেখার জন্য (হ্যাশ দেখানো হয় না)
SELECT
  email,
  username,
  created_at
FROM
  admins;
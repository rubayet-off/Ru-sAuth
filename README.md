# 🔐 Ru'sAuth: Secure Authentication System

A secure, full-featured authentication system made with Next.js, PostgreSQL and Tailwind CSS. It handles sign up, login, Google sign-in, email verification, password recovery, profile photos, multi-device sessions and an admin dashboard, with security built into every step.

**Live demo:** [rusauth.vercel.app](https://rusauth.vercel.app) · **Documentation:** [rusauth.vercel.app/documentation](https://rusauth.vercel.app/documentation)

## ✨ Features

* **Sign up and login:** Email and password on one simple page, or continue with Google.
* **Email verification:** A 6-digit code confirms every new account.
* **Forgot password:** Reset your password with a code sent to your email.
* **Add or change password:** Confirmed by email code, and other devices are signed out.
* **Profile photo:** Upload, crop, zoom, replace or remove your photo.
* **Session management:** See every signed-in device and sign any of them out.
* **Stay signed in:** Sessions renew quietly in the background for up to 10 days.
* **Permanent deletion:** Deleting an account erases the user and their photo for good.
* **Admin dashboard:** A separate admin area with live users, sessions and data cleanup.
* **Security:** bcrypt passwords, rate limiting, HttpOnly cookies, CSRF checks, token rotation and more.

## 🛠️ Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL (Neon) · jose (JWT) · bcryptjs · Zustand · Nodemailer · Cloudinary · Vercel

## 🚀 How to Run This Project

### Step 1: Download the Project

1. Click the green **Code** button at the top of this GitHub page.
2. Click **Download ZIP** and extract the folder on your computer.

### Step 2: Install Dependencies

Open your terminal inside the project folder and run:

```bash
npm install
```

### Step 3: Set Up the Database

1. Create a free database on [Neon](https://neon.tech/).
2. Open the **SQL Editor** in your Neon project.
3. Run `src/sql/neon.sql` to create the tables.
4. Open `src/sql/seedAdmin.sql`, change the admin email, name and password to your own, then run it to create your admin account.

> To reset the database later, run `src/sql/drop.sql`, then repeat steps 3 and 4.

### Step 4: Get Your Service Keys

* **Gmail:** Turn on 2-Step Verification, then create an [App Password](https://myaccount.google.com/apppasswords) for sending emails.
* **Google sign-in:** In [Google Cloud Console](https://console.cloud.google.com/), create an OAuth Client ID and add `http://localhost:3000/api/google/callback` as an authorized redirect URI.
* **Cloudinary:** Create a free [Cloudinary](https://cloudinary.com/) account and copy your cloud name, API key and API secret.

### Step 5: Create the `.env` File

Create a file named `.env` in the project root and fill in your own values:

```env
# Database
DATABASE_URL="your-neon-connection-string"
DATABASE_POOL_MAX=3

# Email (Gmail)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-gmail-app-password"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/google/callback"
GOOGLE_CALLBACK_URL_PRODUCTION="https://your-domain.vercel.app/api/google/callback"

# JWT secrets (use a different random value for each)
JWT_SECRET="random-64-character-string"
JWT_ACCESS_SECRET="random-64-character-string"
JWT_REFRESH_SECRET="random-64-character-string"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Token lifetimes (seconds)
ACCESS_TOKEN_SECONDS=900
REFRESH_TOKEN_SECONDS=864000
FLOW_TOKEN_SECONDS=1800
PASSWORD_UPDATE_SECONDS=600
OAUTH_STATE_SECONDS=600

# OTP
OTP_EXPIRY_MINUTES=5
UNVERIFIED_USER_TTL_MINUTES=30
OTP_RESEND_COOLDOWN_SECONDS=60
MAX_OTP_ATTEMPTS=5

# Password hashing
BCRYPT_ROUNDS=12

# Rate limits
ADMIN_RATE_LIMIT_MAX_REQUESTS=5
ADMIN_RATE_LIMIT_WINDOW_MINUTES=10
ADMIN_RATE_LIMIT_BLOCK_MINUTES=10
USER_RATE_LIMIT_MAX_REQUESTS=20
USER_RATE_LIMIT_WINDOW_MINUTES=20
USER_RATE_LIMIT_BLOCK_MINUTES=20
```

To create a strong random secret, run this in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ Never upload your `.env` file to GitHub. Make sure `.env` is listed in your `.gitignore`.

### Step 6: Start the Project

```bash
npm run dev
```

Now, open [http://localhost:3000](http://localhost:3000) in your browser to see the website. The admin panel is at [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

### Step 7: Host for Free

1. Upload your code to your personal GitHub account.
2. Go to [Vercel](https://vercel.com/) and log in with GitHub.
3. Click **Add New > Project** and import your repository.
4. Open **Environment Variables** and add every value from your `.env` file.
5. Click **Deploy**. Your website will be live in a minute!
6. In Google Cloud Console, add `https://your-domain.vercel.app/api/google/callback` as another authorized redirect URI.

## 👨‍💻 Developer

**Rowshan Rubayet**: [Portfolio](https://rubayet.vercel.app) · [GitHub](https://github.com/rubayet-off) · [LinkedIn](https://www.linkedin.com/in/rowshan-rubayet-off2004)

🔐 If you like this project, please give this repository a Star (⭐)!

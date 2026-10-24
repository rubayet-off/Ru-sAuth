import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Documentation - Ru'sAuth",
  description:
    "Features, authentication flows and security design of Ru'sAuth, a secure authentication system built with Next.js and PostgreSQL.",
};

// ডেভেলপারের পোর্টফোলিও লিংক (এখানে নিজের পোর্টফোলিওর আসল URL বসান)
const PORTFOLIO_URL = "https://rubayet.vercel.app";

// ডেভেলপারের তথ্য ও সোশ্যাল লিংক
const DEVELOPER = {
  name: "Rowshan Rubayet",
  initials: "RR",
  links: [
    { label: "GitHub", href: "https://github.com/rubayet-off" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/rowshan-rubayet-off2004" },
    { label: "Facebook", href: "https://www.facebook.com/share/1Db3Pci5sK/" },
    {
      label: "Instagram",
      href: "https://www.instagram.com/rubayet.off?stkn=MXVzNjFsNndvOTV3Yg==",
    },
  ],
};

// পেজের সেকশন (নেভিগেশন লিংকের জন্য)
const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "flows", label: "Flows" },
  { id: "security", label: "Security" },
  { id: "limits", label: "Rate limits" },
  { id: "developer", label: "Developer" },
];

const TECH_STACK = [
  "Next.js 16 (App Router)",
  "React 19",
  "TypeScript",
  "Tailwind CSS 4",
  "PostgreSQL (Neon)",
  "node-postgres",
  "jose (JWT)",
  "bcryptjs",
  "Zustand",
  "Nodemailer",
  "Cloudinary",
  "Vercel",
];

// হিরো সেকশনের সংক্ষিপ্ত পরিসংখ্যান
const HIGHLIGHTS = [
  { value: "OTP", label: "Email verification" },
  { value: "Live", label: "Session sync across tabs" },
  { value: "2", label: "Separate user and admin sessions" },
  { value: "100%", label: "Parameterized SQL queries" },
];

const FEATURES = [
  {
    title: "Email-first sign in",
    text: "A single email step decides whether you log in or create an account, so the form only ever shows what you need.",
  },
  {
    title: "Google sign in",
    text: "Continue with Google using OAuth 2.0 and a signed state check. Google accounts can later add a password and sign in both ways.",
  },
  {
    title: "Email OTP verification",
    text: "New accounts are verified with a one-time code sent to their email before a session is ever created.",
  },
  {
    title: "Password reset",
    text: "Forgot password sends an OTP, then lets the verified user choose a new password in a short-lived, single-purpose step.",
  },
  {
    title: "Add and change password",
    text: "Signed-in users confirm it is really them with an OTP sent to their registered email before a password is added or changed.",
  },
  {
    title: "Profile and avatar",
    text: "Users can update their profile photo, stored on Cloudinary, and view account details such as join date and last login.",
  },
  {
    title: "Multi-device sessions",
    text: "Every sign in is its own session with browser, device and IP details. Users can revoke one session or all other sessions.",
  },
  {
    title: "Real-time sign out",
    text: "Revoking a session or logging out takes effect across open tabs and devices within seconds, with no manual refresh.",
  },
  {
    title: "Account deletion",
    text: "Users can delete their account. Personal data is scrubbed and every session is revoked immediately.",
  },
  {
    title: "Live admin dashboard",
    text: "A separate admin area that shows verified users, user counts and admin sessions, and updates in real time.",
  },
  {
    title: "Unverified account cleanup",
    text: "Accounts that never verify their email are hidden from the admin list and removed permanently once they pass the time limit.",
  },
  {
    title: "Admin Data Cron",
    text: "One button on the admin dashboard that clears expired unverified accounts, expired OTPs and old rate-limit records on demand.",
  },
];

const FLOWS = [
  {
    title: "Sign in and registration",
    steps: [
      "Enter your email. The server tells the app whether to ask for a password or start registration.",
      "Existing users enter their password. New users choose a username and a password.",
      "New accounts receive an OTP by email and must verify it before signing in.",
      "On success the server creates a session and sets secure, HttpOnly cookies.",
    ],
  },
  {
    title: "Add or change password",
    steps: [
      "Choose Add Password or Change Password on the profile page and check the email shown in the dialog.",
      "An OTP is sent to the registered email only. The email can never be changed in this flow.",
      "Once the OTP is verified it is deleted, and a one-time grant tied to your session is created.",
      "Submit the new password. The grant is checked, used and removed, so the same verification can never be replayed.",
    ],
  },
  {
    title: "Unverified accounts",
    steps: [
      "A new account stays unverified until its email OTP is confirmed, and it never appears in the admin user list.",
      "If the same email is entered again after the time limit (30 minutes by default), the old unverified account is deleted permanently.",
      "The person is taken straight to the registration step and can sign up again with that email.",
      "An admin can also press Data Cron at any time to remove every expired unverified account at once.",
    ],
  },
  {
    title: "Admin sign in",
    steps: [
      "The admin enters email and password on the dedicated admin login page. No OTP is required.",
      "Credentials are checked against the admin record and a separate admin session is created.",
      "Every admin page and API route checks the admin session on the server before returning any data.",
    ],
  },
];

const SECURITY_GROUPS: {
  title: string;
  summary: string;
  items: { title: string; text: string }[];
}[] = [
  {
    title: "Passwords and tokens",
    summary: "How credentials are stored and how access is proven.",
    items: [
      {
        title: "bcrypt hashing",
        text: "Passwords are hashed with bcrypt and never stored or logged in plain text.",
      },
      {
        title: "Separate token secrets",
        text: "Short-lived access tokens and long-lived refresh tokens are signed with different secrets.",
      },
      {
        title: "Hashed refresh tokens",
        text: "Refresh tokens are stored only as hashes, so a database leak cannot be used to sign in.",
      },
      {
        title: "Purpose-bound tokens",
        text: "Each step of a flow has its own token, so a token for one step cannot be used for another.",
      },
      {
        title: "One-time grants",
        text: "Password changes use a grant tied to the user, the session and the action, and it is removed after use.",
      },
    ],
  },
  {
    title: "OTP protection",
    summary: "One-time codes that are short-lived and cannot be reused.",
    items: [
      {
        title: "Secure generation",
        text: "Codes come from a cryptographically secure random source and are stored only as hashes.",
      },
      {
        title: "Expiry and attempt limit",
        text: "Each code expires after a short time and allows only a few wrong attempts.",
      },
      {
        title: "Resend cooldown",
        text: "A cooldown stops OTP spam, and a new code immediately invalidates the previous one.",
      },
      {
        title: "Deleted after use",
        text: "A used OTP is removed straight away. No used-code records are kept.",
      },
    ],
  },
  {
    title: "Sessions and cookies",
    summary: "Sessions that can be controlled and revoked instantly.",
    items: [
      {
        title: "Hardened cookies",
        text: "Cookies are HttpOnly, Secure and SameSite, and use the __Host- prefix in production.",
      },
      {
        title: "Server-side sessions",
        text: "Sessions live in the database, so they can be revoked from any device in real time.",
      },
      {
        title: "User and admin separation",
        text: "User and admin sessions use separate tables and can never be mistaken for each other.",
      },
      {
        title: "Server-verified admin",
        text: "Admin access is always checked on the server, never from client state or an editable role.",
      },
    ],
  },
  {
    title: "Web attack protection",
    summary: "Defenses that run in the browser and at the edge.",
    items: [
      {
        title: "CSRF",
        text: "State-changing requests must come from the same origin with a custom header, and cross-site requests are rejected with Sec-Fetch-Site.",
      },
      {
        title: "CORS",
        text: "No cross-origin API access is allowed, and preflight requests are refused.",
      },
      {
        title: "XSS",
        text: "React escapes all output, no raw HTML is rendered, and a strict Content-Security-Policy limits what can load.",
      },
      {
        title: "Clickjacking and sniffing",
        text: "X-Frame-Options, frame-ancestors, nosniff and a strict Referrer-Policy are set on every response, and HSTS forces HTTPS in production.",
      },
    ],
  },
  {
    title: "Database security",
    summary: "Safe queries and a protected connection.",
    items: [
      {
        title: "Parameterized queries",
        text: "Every query uses parameters, which prevents SQL injection. Table names come only from fixed constants.",
      },
      {
        title: "Verified TLS",
        text: "The connection to Neon is encrypted and the server certificate is verified.",
      },
      {
        title: "Transactions and row locks",
        text: "Sensitive changes run inside transactions, so concurrent requests cannot bypass the rules.",
      },
      {
        title: "Hashed limiter keys",
        text: "Rate-limit keys are stored as SHA-256 hashes, so emails and IP addresses cannot be read from the table.",
      },
    ],
  },
  {
    title: "Brute-force protection",
    summary: "Abuse is stopped by rate limiting, not account locks.",
    items: [
      {
        title: "Database-backed limiter",
        text: "Counters live in the database, so limits hold across every serverless instance.",
      },
      {
        title: "Blocked even with the right password",
        text: "Once a limit is passed, further requests are refused for a set time, which makes guessing impractical.",
      },
      {
        title: "No lock counters on accounts",
        text: "Failed attempts are not stored on user or admin records, so nobody can lock an admin out by guessing.",
      },
    ],
  },
  {
    title: "Privacy",
    summary: "Collect less, reveal less.",
    items: [
      {
        title: "No email disclosure on reset",
        text: "Forgot password always returns the same response, so it does not reveal whether an email is registered.",
      },
      {
        title: "Uniform admin errors",
        text: "Admin login gives the same error and takes similar time for a wrong email or a wrong password.",
      },
      {
        title: "No Google photos",
        text: "Google profile photos are not collected. Only images the user uploads are stored.",
      },
      {
        title: "Generic error messages",
        text: "Errors never expose internal details, stack traces or database information.",
      },
    ],
  },
  {
    title: "Configuration and data hygiene",
    summary: "Tunable settings and a database that stays tidy.",
    items: [
      {
        title: "Environment-driven limits",
        text: "Token lifetimes, OTP rules, rate limits and the unverified-account limit all come from environment variables.",
      },
      {
        title: "Strong secrets enforced",
        text: "In production, signing secrets shorter than 32 characters are rejected.",
      },
      {
        title: "Unverified accounts removed",
        text: "Accounts that never verify are deleted permanently after the time limit and never shown to the admin.",
      },
      {
        title: "Admin-run cleanup",
        text: "Data Cron clears expired accounts, OTPs and limiter records only when the admin chooses to run it.",
      },
    ],
  },
];

// অথেন্টিকেশন rate limit এর ডিফল্ট মান (.env থেকে বদলানো যায়)
const RATE_LIMITS = [
  {
    who: "Admin login",
    keyedBy: "Device (IP address)",
    limit: "5 requests",
    window: "10 minutes",
    block: "10 minutes",
  },
  {
    who: "User authentication forms",
    keyedBy: "Email address",
    limit: "20 requests",
    window: "20 minutes",
    block: "20 minutes",
  },
];

// সোশ্যাল ও পোর্টফোলিও আইকন
function SocialIcon({ label }: { label: string }) {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (label === "Portfolio") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
  }

  if (label === "GitHub") {
    return (
      <svg {...common}>
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
        <path d="M9 18c-4.51 2-5-2-7-2" />
      </svg>
    );
  }

  if (label === "LinkedIn") {
    return (
      <svg {...common}>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    );
  }

  if (label === "Facebook") {
    return (
      <svg {...common}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

// ছোট টিক চিহ্ন (নিরাপত্তা তালিকার প্রতিটি আইটেমের আগে)
function CheckBadge() {
  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#60A5FA]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

// সেকশনের শিরোনাম
function SectionHeading({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div id={id} className="flex scroll-mt-24 flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
      {children && (
        <p className="max-w-3xl text-sm leading-7 text-[#92949D] sm:text-base sm:leading-8">
          {children}
        </p>
      )}
    </div>
  );
}

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-[#0E0F12] font-sans text-[#EAEAEA] selection:bg-[#3B82F6]/30 selection:text-white">
      {/* Navbar */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[#2d2f36] bg-[#15161A]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            Ru&apos;sAuth <span className="font-medium text-[#3B82F6]">Docs</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-sm text-[#92949D] transition-colors hover:text-white"
              >
                {section.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main className="mx-auto flex max-w-5xl flex-col gap-24 px-6 pb-24 pt-32">
        {/* Hero / Overview */}
        <section id="overview" className="flex scroll-mt-24 flex-col gap-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">
            Documentation
          </p>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Ru&apos;sAuth
          </h1>

          <p className="max-w-3xl text-base leading-8 text-[#92949D] sm:text-lg sm:leading-9">
            Ru&apos;sAuth is a secure authentication system for the web. It combines email and
            password sign in, Google sign in, email OTP verification, multi-device session
            management and a protected admin dashboard, all built around defense in depth.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[#2d2f36] bg-[#15161A] px-4 py-4"
              >
                <p className="text-2xl font-bold text-[#60A5FA]">{item.value}</p>
                <p className="mt-1 text-xs leading-5 text-[#92949D]">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="rounded-md bg-[#15161A] px-3 py-1.5 text-sm font-medium text-[#EAEAEA] ring-1 ring-inset ring-[#2d2f36]"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="flex flex-col gap-10 border-t border-[#2d2f36] pt-20">
          <SectionHeading id="features" eyebrow="Features" title="What Ru'sAuth can do">
            Everything a user or an administrator needs to sign in, stay in control of their
            account and manage access safely.
          </SectionHeading>

          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className="flex gap-4 rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 transition-colors hover:border-[#3B82F6]/40"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 text-sm font-semibold text-[#60A5FA]">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div>
                  <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#92949D]">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Flows */}
        <section className="flex flex-col gap-10 border-t border-[#2d2f36] pt-20">
          <SectionHeading id="flows" eyebrow="Authentication flows" title="How it works">
            Each flow is split into small steps. Every step is checked on the server before the
            next one is allowed.
          </SectionHeading>

          <div className="grid gap-6 lg:grid-cols-2">
            {FLOWS.map((flow) => (
              <div
                key={flow.title}
                className="rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 sm:p-8"
              >
                <h3 className="text-lg font-semibold text-white">{flow.title}</h3>

                <ol className="mt-7 flex flex-col">
                  {flow.steps.map((step, index) => (
                    <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
                      {/* ধাপগুলোর মধ্যে সংযোগ রেখা */}
                      {index < flow.steps.length - 1 && (
                        <span className="absolute left-3.5 top-8 h-[calc(100%-2rem)] w-px bg-[#2d2f36]" />
                      )}

                      <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#3B82F6]/50 bg-[#15161A] text-xs font-semibold text-[#60A5FA]">
                        {index + 1}
                      </span>

                      <p className="pt-0.5 text-sm leading-7 text-[#92949D]">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        <section className="flex flex-col gap-10 border-t border-[#2d2f36] pt-20">
          <SectionHeading id="security" eyebrow="Security" title="Security features">
            Security is built into every layer: passwords, tokens, sessions, the browser, the
            network and the database.
          </SectionHeading>

          <div className="grid gap-6 lg:grid-cols-2">
            {SECURITY_GROUPS.map((group) => (
              <div
                key={group.title}
                className="rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 sm:p-8"
              >
                <h3 className="text-lg font-semibold text-white">{group.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#787878]">{group.summary}</p>

                <ul className="mt-6 flex flex-col divide-y divide-[#2d2f36]">
                  {group.items.map((item) => (
                    <li key={item.title} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                      <CheckBadge />

                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1.5 text-sm leading-7 text-[#92949D]">{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Rate limits */}
        <section className="flex flex-col gap-10 border-t border-[#2d2f36] pt-20">
          <SectionHeading id="limits" eyebrow="Brute-force protection" title="Rate limiting">
            Instead of locking accounts, repeated requests are stopped by a database-backed rate
            limiter that works across every server instance. When a limit is passed, further
            requests are blocked for a set time, even with the correct password. Every value is
            configurable through environment variables.
          </SectionHeading>

          <div className="overflow-x-auto rounded-xl border border-[#2d2f36] bg-[#15161A]">
            <table className="w-full min-w-136 text-left text-sm">
              <thead>
                <tr className="border-b border-[#2d2f36] text-xs uppercase tracking-wider text-[#787878]">
                  <th className="px-6 py-4 font-semibold">Protected area</th>
                  <th className="px-6 py-4 font-semibold">Counted by</th>
                  <th className="px-6 py-4 font-semibold">Allowed</th>
                  <th className="px-6 py-4 font-semibold">Within</th>
                  <th className="px-6 py-4 font-semibold">Then blocked for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2f36]">
                {RATE_LIMITS.map((row) => (
                  <tr key={row.who}>
                    <td className="px-6 py-5 font-medium text-white">{row.who}</td>
                    <td className="px-6 py-5 text-[#92949D]">{row.keyedBy}</td>
                    <td className="px-6 py-5 text-[#92949D]">{row.limit}</td>
                    <td className="px-6 py-5 text-[#92949D]">{row.window}</td>
                    <td className="px-6 py-5 text-[#92949D]">{row.block}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm leading-7 text-[#787878]">
            User limits cover every authentication form: email, login, registration, OTP
            verification, resend, forgot password, new password, and add or change password. The
            numbers above are the defaults.
          </p>
        </section>

        {/* Developer */}
        <section className="flex flex-col gap-10 border-t border-[#2d2f36] pt-20">
          <SectionHeading id="developer" eyebrow="Developer" title="Built by" />

          <div className="flex flex-col gap-7 rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/10 text-xl font-bold text-[#60A5FA]">
                {DEVELOPER.initials}
              </span>

              <div>
                <p className="text-xl font-bold text-white">{DEVELOPER.name}</p>
                <p className="mt-1 text-sm text-[#92949D]">Developer of Ru&apos;sAuth</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* পোর্টফোলিও লিংক */}
              <a
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center gap-2 rounded-lg border border-[#3B82F6] bg-[#3B82F6] px-4 text-sm font-medium text-white transition-colors hover:bg-transparent hover:text-[#60A5FA]"
              >
                <SocialIcon label="Portfolio" />
                <span className="leading-none">Portfolio</span>
              </a>

              {DEVELOPER.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.label}
                  aria-label={link.label}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#2d2f36] bg-[#0E0F12] text-[#92949D] transition-colors hover:border-[#3B82F6] hover:text-[#3B82F6]"
                >
                  <SocialIcon label={link.label} />
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2d2f36] py-8">
        <p className="mx-auto max-w-5xl px-6 text-center text-sm text-[#787878]">
          Ru&apos;sAuth &middot; Designed and developed by {DEVELOPER.name}
        </p>
      </footer>
    </div>
  );
}

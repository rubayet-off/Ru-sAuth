import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Documentation - Ru'sAuth",
  description:
    "Features, authentication flows and security design of Ru'sAuth, a secure authentication system built with Next.js and PostgreSQL.",
};

// ডেভেলপারের তথ্য ও সোশ্যাল লিংক
const DEVELOPER = {
  name: "Rowshan Rubayet",
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

const FEATURES = [
  {
    title: "Email-first sign in",
    text: "A single email step decides whether you log in or create an account, so the form always shows only what you need.",
  },
  {
    title: "Google sign in",
    text: "Continue with Google using OAuth 2.0 with a signed state check. Google accounts can later add a password to sign in both ways.",
  },
  {
    title: "Email OTP verification",
    text: "New accounts are verified with a one-time code sent to the email address before a session is ever created.",
  },
  {
    title: "Password reset",
    text: "Forgot password sends an OTP, then lets the verified user choose a new password through a short-lived, single-purpose step.",
  },
  {
    title: "Add and change password",
    text: "Signed-in users confirm it is really them with an OTP sent to their registered email before a password is added or changed.",
  },
  {
    title: "Profile and avatar",
    text: "Users can update their profile photo (stored on Cloudinary) and view account details such as join date and last login.",
  },
  {
    title: "Multi-device sessions",
    text: "Every sign in is a separate session with browser, device and IP details. Users can revoke one session or all other sessions.",
  },
  {
    title: "Real-time sign out",
    text: "Revoking or logging out takes effect across open tabs and devices within seconds, without a manual refresh.",
  },
  {
    title: "Account deletion",
    text: "Users can delete their account. Personal data is scrubbed and every session is revoked immediately.",
  },
  {
    title: "Admin dashboard",
    text: "A separate admin area with live system users, user counts and admin session management, updating in real time.",
  },
];

const FLOWS = [
  {
    title: "Sign in and registration",
    steps: [
      "Enter your email. The server tells the app whether to ask for a password or start registration.",
      "Existing users enter their password. New users choose a username and password.",
      "New accounts receive an OTP by email and must verify it before signing in.",
      "On success the server creates a session and sets secure, HttpOnly cookies.",
    ],
  },
  {
    title: "Add or change password",
    steps: [
      "Choose Add Password or Change Password on the profile page and confirm the email shown in the dialog.",
      "An OTP is sent to the registered email only. The email can never be changed in this flow.",
      "After the OTP is verified, it is deleted and a one-time grant tied to your session is created.",
      "Submit the new password. The grant is checked, used and removed, so the same verification cannot be replayed.",
    ],
  },
  {
    title: "Admin sign in",
    steps: [
      "The admin enters email and password on the dedicated admin login page. No OTP is required.",
      "Credentials are checked against the admin record and a separate admin session is created.",
      "Every admin page and API route checks the admin session on the server before returning data.",
    ],
  },
];

const SECURITY_GROUPS: { title: string; items: string[] }[] = [
  {
    title: "Passwords and tokens",
    items: [
      "Passwords are hashed with bcrypt (12 rounds) and never stored or logged in plain text.",
      "Short-lived access tokens (15 minutes) and long-lived refresh tokens (10 days) are signed with separate secrets.",
      "Refresh tokens are stored only as hashes, so a database leak cannot be used to sign in.",
      "Each step of a flow uses its own purpose-bound token, so a token for one step cannot be used for another.",
      "Password changes use one-time grants bound to the user, the session and the action (add or change).",
    ],
  },
  {
    title: "OTP protection",
    items: [
      "OTPs are generated with a cryptographically secure random source and stored only as hashes.",
      "Each code expires after 10 minutes and allows a limited number of wrong attempts.",
      "A resend cooldown stops OTP spam, and a new code invalidates the previous one.",
      "A used OTP is deleted immediately. No used-code records are kept.",
    ],
  },
  {
    title: "Sessions and cookies",
    items: [
      "Cookies are HttpOnly, Secure and SameSite, and use the __Host- prefix in production.",
      "Sessions are stored in the database, so they can be revoked instantly from any device.",
      "User and admin sessions live in separate tables and can never be mistaken for each other.",
      "Admin access is always verified on the server, never from client state or a user-editable role.",
    ],
  },
  {
    title: "Web attack protection",
    items: [
      "CSRF: every state-changing request must come from the same origin and carry a custom header, and cross-site requests are rejected using Sec-Fetch-Site.",
      "CORS: no cross-origin API access is allowed, and preflight requests are refused.",
      "XSS: React escapes all output, there is no raw HTML rendering, and a strict Content-Security-Policy limits what can load.",
      "Clickjacking and sniffing: X-Frame-Options, frame-ancestors, nosniff and a strict Referrer-Policy are set on every response.",
      "HSTS forces HTTPS in production.",
    ],
  },
  {
    title: "Database security",
    items: [
      "Every query is parameterized, which prevents SQL injection. Table names come only from fixed constants.",
      "The connection to Neon uses TLS with certificate verification.",
      "Sensitive changes run inside transactions with row locks, so concurrent requests cannot bypass rules.",
      "Rate limit keys are stored as SHA-256 hashes, so emails and IP addresses are not readable from the table.",
    ],
  },
  {
    title: "Privacy",
    items: [
      "Forgot password always returns the same response, so it does not reveal whether an email is registered.",
      "Admin login returns the same error for a wrong email or a wrong password and takes similar time for both.",
      "Google profile photos are not collected. Only images the user uploads are stored.",
      "Error messages are generic and never expose internal details.",
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

// সোশ্যাল আইকন (পোর্টফোলিও পেজের আইকনই)
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
    <div id={id} className="scroll-mt-24 flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
      {children && (
        <p className="max-w-3xl text-sm leading-7 text-[#92949D] sm:text-base">{children}</p>
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
          <a href="/" className="text-xl font-bold tracking-tight text-white">
            Ru&apos;sAuth <span className="font-medium text-[#3B82F6]">Docs</span>
          </a>

          <div className="hidden items-center gap-5 md:flex">
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

      <main className="mx-auto flex max-w-5xl flex-col gap-20 px-6 pb-20 pt-32">
        {/* Hero / Overview */}
        <section id="overview" className="scroll-mt-24 flex flex-col gap-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">
            Documentation
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Ru&apos;sAuth
          </h1>
          <p className="max-w-3xl text-base leading-8 text-[#92949D] sm:text-lg">
            Ru&apos;sAuth is a secure authentication system for the web. It combines email and
            password sign in, Google sign in, email OTP verification, multi-device session
            management and a protected admin dashboard, all built around defense in depth.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
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
        <section className="flex flex-col gap-8 border-t border-[#2d2f36] pt-16">
          <SectionHeading id="features" eyebrow="Features" title="What Ru'sAuth can do">
            Everything a user or an administrator needs to sign in, stay in control of their
            account and manage access safely.
          </SectionHeading>

          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-[#2d2f36] bg-[#15161A] p-5"
              >
                <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#92949D]">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Flows */}
        <section className="flex flex-col gap-8 border-t border-[#2d2f36] pt-16">
          <SectionHeading id="flows" eyebrow="Authentication flows" title="How it works">
            Each flow is split into small steps. Every step is checked on the server before the
            next one is allowed.
          </SectionHeading>

          <div className="flex flex-col gap-6">
            {FLOWS.map((flow) => (
              <div
                key={flow.title}
                className="rounded-xl border border-[#2d2f36] bg-[#15161A] p-6"
              >
                <h3 className="text-lg font-semibold text-white">{flow.title}</h3>

                <ol className="mt-5 flex flex-col gap-4">
                  {flow.steps.map((step, index) => (
                    <li key={step} className="flex gap-4">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#3B82F6]/50 bg-[#3B82F6]/10 text-xs font-semibold text-[#60A5FA]">
                        {index + 1}
                      </span>
                      <p className="pt-0.5 text-sm leading-6 text-[#92949D]">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        <section className="flex flex-col gap-8 border-t border-[#2d2f36] pt-16">
          <SectionHeading id="security" eyebrow="Security" title="Security features">
            Security is built into every layer: passwords, tokens, sessions, the browser, the
            network and the database.
          </SectionHeading>

          <div className="grid gap-4 lg:grid-cols-2">
            {SECURITY_GROUPS.map((group) => (
              <div
                key={group.title}
                className="rounded-xl border border-[#2d2f36] bg-[#15161A] p-6"
              >
                <h3 className="text-base font-semibold text-white">{group.title}</h3>

                <ul className="mt-4 flex flex-col gap-3">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-[#92949D]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Rate limits */}
        <section className="flex flex-col gap-8 border-t border-[#2d2f36] pt-16">
          <SectionHeading id="limits" eyebrow="Brute-force protection" title="Rate limiting">
            Instead of locking accounts, repeated requests are stopped by a database-backed
            rate limiter that works across every server instance. When a limit is passed, further
            requests are blocked for a set time, even with the correct password. All values are
            configurable through environment variables.
          </SectionHeading>

          <div className="overflow-x-auto rounded-xl border border-[#2d2f36] bg-[#15161A]">
            <table className="w-full min-w-136 text-left text-sm">
              <thead>
                <tr className="border-b border-[#2d2f36] text-xs uppercase tracking-wider text-[#787878]">
                  <th className="px-5 py-3 font-semibold">Protected area</th>
                  <th className="px-5 py-3 font-semibold">Counted by</th>
                  <th className="px-5 py-3 font-semibold">Allowed</th>
                  <th className="px-5 py-3 font-semibold">Within</th>
                  <th className="px-5 py-3 font-semibold">Then blocked for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2f36]">
                {RATE_LIMITS.map((row) => (
                  <tr key={row.who}>
                    <td className="px-5 py-4 font-medium text-white">{row.who}</td>
                    <td className="px-5 py-4 text-[#92949D]">{row.keyedBy}</td>
                    <td className="px-5 py-4 text-[#92949D]">{row.limit}</td>
                    <td className="px-5 py-4 text-[#92949D]">{row.window}</td>
                    <td className="px-5 py-4 text-[#92949D]">{row.block}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm leading-6 text-[#787878]">
            User limits cover every authentication form: email, login, registration, OTP
            verification, resend, forgot password, new password, and add or change password.
          </p>
        </section>

        {/* Developer */}
        <section className="flex flex-col gap-8 border-t border-[#2d2f36] pt-16">
          <SectionHeading id="developer" eyebrow="Developer" title="Built by" />

          <div className="flex flex-col gap-5 rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-bold text-white">{DEVELOPER.name}</p>
              <p className="mt-1 text-sm text-[#92949D]">Developer of Ru&apos;sAuth</p>
            </div>

            <div className="flex items-center gap-3">
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

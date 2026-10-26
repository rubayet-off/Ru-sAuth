import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";

import Logo from "@/app/component/Logo";

export const metadata: Metadata = {
  title: "Documentation - Ru'sAuth",
  description:
    "Features, authentication flows and security design of Ru'sAuth, a secure authentication system built with Next.js and PostgreSQL.",
};

// ডেভেলপারের পোর্টফোলিও লিংক
const PORTFOLIO_URL = "https://rubayet.vercel.app";

// ডেভেলপারের তথ্য ও সোশ্যাল লিংক
const DEVELOPER = {
  name: "Rowshan Rubayet",
  initials: "RR",
  links: [
    { label: "GitHub", href: "https://github.com/rubayet-off" },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/rowshan-rubayet-off2004",
    },
    { label: "Facebook", href: "https://www.facebook.com/share/1Db3Pci5sK/" },
    {
      label: "Instagram",
      href: "https://www.instagram.com/rubayet.off?stkn=MXVzNjFsNndvOTV3Yg==",
    },
  ],
};

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

// সিস্টেমের চার ধাপের কাঠামো
const ARCHITECTURE = [
  {
    icon: "monitor" as const,
    name: "Browser",
    lines: ["React interface", "HttpOnly cookies", "Strict CSP"],
  },
  {
    icon: "shield" as const,
    name: "Proxy",
    lines: ["Origin guard", "Security headers", "Route guard"],
  },
  {
    icon: "server" as const,
    name: "API routes",
    lines: ["CSRF checks", "Rate limiter", "Session checks"],
  },
  {
    icon: "database" as const,
    name: "Neon PostgreSQL",
    lines: ["Verified TLS", "Hashed secrets", "Transactions"],
  },
];

// যুক্ত বাইরের সেবা
const SERVICES = [
  { name: "Gmail (SMTP)", use: "Sends OTP emails" },
  { name: "Google OAuth", use: "Sign in with Google" },
  { name: "Cloudinary", use: "Stores profile photos" },
  { name: "Vercel", use: "Hosts the app" },
];

// ফিচারগুলো তিনটি ভাগে
const FEATURE_GROUPS = [
  {
    title: "Accounts and sign in",
    features: [
      {
        title: "Email-first sign in",
        text: "A single email step decides whether you log in or create an account, so the form only shows what you need.",
      },
      {
        title: "Google sign in",
        text: "Continue with Google using OAuth 2.0 and a signed state check. Google accounts can later add a password.",
      },
      {
        title: "Email OTP verification",
        text: "New accounts are verified with a one-time code sent to their email before a session is created.",
      },
      {
        title: "Password reset",
        text: "Forgot password sends an OTP, then lets the verified user choose a new password in a short-lived step.",
      },
      {
        title: "Add and change password",
        text: "Signed-in users confirm it is really them with an OTP before a password is added or changed.",
      },
      {
        title: "Account deletion",
        text: "Users can delete their account. Personal data is scrubbed and every session is revoked immediately.",
      },
    ],
  },
  {
    title: "Sessions and profile",
    features: [
      {
        title: "Profile and avatar",
        text: "Users can update their profile photo and view account details such as join date and last login.",
      },
      {
        title: "Multi-device sessions",
        text: "Every sign in is its own session with browser, device and IP details. Revoke one or all others.",
      },
      {
        title: "Real-time sign out",
        text: "Revoking a session or logging out takes effect across open tabs and devices within seconds.",
      },
      {
        title: "Automatic session renewal",
        text: "Tokens are renewed quietly in the background, so an active user is never interrupted by an expiry.",
      },
    ],
  },
  {
    title: "Admin tools",
    features: [
      {
        title: "Live admin dashboard",
        text: "A separate admin area showing verified users, counts and admin sessions, updating in real time.",
      },
      {
        title: "Unverified account cleanup",
        text: "Accounts that never verify are hidden from the admin list and removed once they pass the time limit.",
      },
      {
        title: "Admin Data Cron",
        text: "One button that clears expired unverified accounts, expired OTPs and old limiter records on demand.",
      },
    ],
  },
];

// প্রতিটি flow এক বা একাধিক লেনে, প্রতিটি লেনে ধাপগুলো তীর দিয়ে যুক্ত
const FLOWS: {
  title: string;
  summary: string;
  lanes: { label?: string; steps: { title: string; text: string }[] }[];
}[] = [
  {
    title: "Sign in and registration",
    summary: "One email step routes you to the right path.",
    lanes: [
      {
        label: "Existing account",
        steps: [
          { title: "Enter email", text: "The server finds your account." },
          {
            title: "Enter password",
            text: "Checked with bcrypt and rate limited.",
          },
          { title: "Signed in", text: "Secure HttpOnly cookies are set." },
        ],
      },
      {
        label: "New account",
        steps: [
          { title: "Enter email", text: "No account is found for it." },
          { title: "Create account", text: "Choose a username and password." },
          { title: "Verify OTP", text: "A code is sent to your email." },
          { title: "Signed in", text: "A session starts after verifying." },
        ],
      },
    ],
  },
  {
    title: "Add or change password",
    summary: "An OTP to your own email proves it is you.",
    lanes: [
      {
        steps: [
          {
            title: "Confirm",
            text: "The dialog shows your email. It cannot be changed.",
          },
          { title: "OTP sent", text: "Only to your registered address." },
          {
            title: "OTP verified",
            text: "The code is deleted. A one-time grant is created.",
          },
          { title: "Password saved", text: "The grant is used and removed." },
        ],
      },
    ],
  },
  {
    title: "Session renewal",
    summary: "Sessions stay alive without interrupting the user.",
    lanes: [
      {
        steps: [
          { title: "Access token ages", text: "It lasts about 15 minutes." },
          {
            title: "Silent refresh",
            text: "One open tab renews it in the background.",
          },
          {
            title: "Token rotated",
            text: "The old token still works for 30 seconds.",
          },
          { title: "No interruption", text: "Requests in flight never fail." },
        ],
      },
    ],
  },
  {
    title: "Unverified accounts",
    summary: "Abandoned sign-ups never pile up or reach the admin list.",
    lanes: [
      {
        steps: [
          {
            title: "Registered",
            text: "Unverified until the OTP is confirmed.",
          },
          { title: "Hidden", text: "Never shown in the admin user list." },
          {
            title: "Expired",
            text: "After 30 minutes by default, entering the email removes it.",
          },
          {
            title: "Start again",
            text: "The person goes straight to registration.",
          },
        ],
      },
    ],
  },
  {
    title: "Admin sign in",
    summary: "A separate door with its own session and checks.",
    lanes: [
      {
        steps: [
          { title: "Admin login", text: "Dedicated page, no OTP needed." },
          {
            title: "Credentials checked",
            text: "Same error for any wrong detail.",
          },
          { title: "Admin session", text: "Stored apart from user sessions." },
          {
            title: "Dashboard",
            text: "Every request is verified on the server.",
          },
        ],
      },
    ],
  },
];

// নিরাপত্তার স্তর (বাইরে থেকে ভেতরে)
const LAYERS = [
  {
    icon: "monitor" as const,
    name: "Browser",
    subtitle: "What the visitor's device can and cannot do",
    controls: [
      "HttpOnly cookies",
      "Secure and SameSite",
      "__Host- prefix",
      "Content-Security-Policy",
      "Escaped output",
    ],
  },
  {
    icon: "shield" as const,
    name: "Proxy (edge)",
    subtitle: "The first stop for every request",
    controls: [
      "Cross-origin block",
      "CORS preflight refused",
      "HSTS and frame denial",
      "nosniff",
      "Signed-cookie route guard",
    ],
  },
  {
    icon: "server" as const,
    name: "API routes",
    subtitle: "Where every action is checked again",
    controls: [
      "Custom CSRF header",
      "Sec-Fetch-Site check",
      "Rate limiting",
      "Server-side session check",
      "Purpose-bound tokens",
      "Generic errors",
    ],
  },
  {
    icon: "database" as const,
    name: "Database",
    subtitle: "What is stored and how it is protected",
    controls: [
      "Parameterized queries",
      "Verified TLS",
      "Hashed passwords",
      "Hashed OTPs and tokens",
      "Row locks and transactions",
    ],
  },
];

// টোকেনের জীবনচক্র (ছবি; অনুপাত আনুমানিক)
const LIFECYCLE = [
  {
    name: "Access token",
    note: "Default 15 minutes",
    segments: [
      {
        label: "Valid for about 15 minutes",
        width: 62,
        tone: "primary" as const,
      },
      { label: "Renewed", width: 38, tone: "muted" as const },
    ],
  },
  {
    name: "Silent refresh",
    note: "About every 10 minutes while a tab is open",
    segments: [
      { label: "Waiting", width: 62, tone: "muted" as const },
      {
        label: "Refresh runs once across all tabs",
        width: 38,
        tone: "primary" as const,
      },
    ],
  },
  {
    name: "Refresh token",
    note: "Default 10 days, extended on every refresh",
    segments: [
      {
        label: "Valid for up to 10 days of inactivity",
        width: 100,
        tone: "primary" as const,
      },
    ],
  },
  {
    name: "On each refresh",
    note: "Rotation with a short grace period",
    segments: [
      { label: "New token", width: 55, tone: "primary" as const },
      {
        label: "Old token still accepted for 30 s",
        width: 45,
        tone: "warn" as const,
      },
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
        text: "Access and refresh tokens are signed with different secrets.",
      },
      {
        title: "Hashed refresh tokens",
        text: "Refresh tokens are stored only as hashes, so a database leak cannot be used to sign in.",
      },
      {
        title: "Rotation with grace",
        text: "Each refresh replaces the token. The previous one works for 30 seconds so in-flight requests never fail.",
      },
      {
        title: "Purpose-bound tokens",
        text: "Each step of a flow has its own token, so one step's token cannot be used for another.",
      },
      {
        title: "One-time grants",
        text: "Password changes use a grant tied to the user, session and action, removed after use.",
      },
    ],
  },
  {
    title: "OTP protection",
    summary: "One-time codes that are short-lived and cannot be reused.",
    items: [
      {
        title: "Secure generation",
        text: "Codes come from a cryptographically secure source and are stored only as hashes.",
      },
      {
        title: "Expiry and attempt limit",
        text: "Each code expires quickly and allows only a few wrong attempts.",
      },
      {
        title: "Resend cooldown",
        text: "A cooldown stops OTP spam, and a new code invalidates the previous one.",
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
        text: "HttpOnly, Secure and SameSite, with the __Host- prefix in production.",
      },
      {
        title: "Server-side sessions",
        text: "Sessions live in the database, so they can be revoked from any device in real time.",
      },
      {
        title: "User and admin separation",
        text: "Separate tables and token types. One can never be mistaken for the other.",
      },
      {
        title: "One sign-in per browser",
        text: "Signing in while another account is active is refused, so sessions never overwrite each other.",
      },
      {
        title: "Safe sign-out handling",
        text: "The app confirms a session is really dead before signing out. A token that merely changed never wipes cookies.",
      },
    ],
  },
  {
    title: "Web attack protection",
    summary: "Defenses that run in the browser and at the edge.",
    items: [
      {
        title: "CSRF",
        text: "Requests must come from the same origin with a custom header, and cross-site requests are rejected with Sec-Fetch-Site.",
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
        text: "Frame denial, nosniff and a strict Referrer-Policy are set on every response, and HSTS forces HTTPS.",
      },
    ],
  },
  {
    title: "Database security",
    summary: "Safe queries and a protected connection.",
    items: [
      {
        title: "Parameterized queries",
        text: "Every query uses parameters, which prevents SQL injection.",
      },
      {
        title: "Verified TLS",
        text: "The connection to Neon is encrypted and the server certificate is verified.",
      },
      {
        title: "Transactions and row locks",
        text: "Sensitive changes run in transactions, so concurrent requests cannot bypass the rules.",
      },
      {
        title: "Hashed limiter keys",
        text: "Emails and IP addresses are stored as SHA-256 hashes in the rate-limit table.",
      },
    ],
  },
  {
    title: "Privacy and data hygiene",
    summary: "Collect less, reveal less, delete what is stale.",
    items: [
      {
        title: "No email disclosure on reset",
        text: "Forgot password always returns the same response, so it never reveals who is registered.",
      },
      {
        title: "Uniform admin errors",
        text: "Admin login gives the same error and takes similar time for any wrong detail.",
      },
      {
        title: "No Google photos",
        text: "Google profile photos are not collected. Only images the user uploads are stored.",
      },
      {
        title: "Stale data removed",
        text: "Unverified accounts, expired OTPs and old limiter records are deleted, never kept.",
      },
    ],
  },
];

// অথেন্টিকেশন rate limit এর ডিফল্ট মান (.env থেকে বদলানো যায়)
const RATE_LIMITS = [
  {
    who: "Admin login",
    keyedBy: "Device (IP address)",
    max: 5,
    window: "10 minutes",
    block: "10 minutes",
  },
  {
    who: "User authentication forms",
    keyedBy: "Email address",
    max: 20,
    window: "20 minutes",
    block: "20 minutes",
  },
];

type IconName =
  | "monitor"
  | "shield"
  | "server"
  | "database"
  | "arrowRight"
  | "arrowDown"
  | "check"
  | "globe";

// ছোট আইকন সংগ্রহ (সবগুলোই স্থির, কোনো অ্যানিমেশন নেই)
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {name === "monitor" && (
        <>
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </>
      )}
      {name === "shield" && (
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      )}
      {name === "server" && (
        <>
          <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
          <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
          <line x1="6" x2="6.01" y1="6" y2="6" />
          <line x1="6" x2="6.01" y1="18" y2="18" />
        </>
      )}
      {name === "database" && (
        <>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5V19A9 3 0 0 0 21 19V5" />
          <path d="M3 12A9 3 0 0 0 21 12" />
        </>
      )}
      {name === "arrowRight" && (
        <>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </>
      )}
      {name === "arrowDown" && (
        <>
          <path d="M12 5v14" />
          <path d="m19 12-7 7-7-7" />
        </>
      )}
      {name === "check" && <path d="M20 6 9 17l-5-5" />}
      {name === "globe" && (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </>
      )}
    </svg>
  );
}

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
    <div id={id} className="flex scroll-mt-28 flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {title}
      </h2>
      {children && (
        <p className="max-w-3xl text-sm leading-7 text-[#92949D] sm:text-base sm:leading-8">
          {children}
        </p>
      )}
    </div>
  );
}

// ধাপগুলোর মাঝের তীর (বড় পর্দায় ডানমুখী, ছোট পর্দায় নিচমুখী)
function Connector() {
  return (
    <div className="flex shrink-0 items-center justify-center py-1 text-[#3B82F6] lg:px-2.5 lg:py-0">
      <span className="hidden lg:block">
        <Icon name="arrowRight" size={18} />
      </span>
      <span className="lg:hidden">
        <Icon name="arrowDown" size={18} />
      </span>
    </div>
  );
}

// একটি লেনের ধাপগুলো বাক্স ও তীর দিয়ে দেখায়
function Pipeline({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-stretch">
      {steps.map((step, index) => (
        <Fragment key={step.title + index}>
          <div className="flex flex-1 flex-col gap-2 rounded-xl border border-[#2d2f36] bg-[#0E0F12] p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#3B82F6]/50 bg-[#3B82F6]/10 text-xs font-semibold text-[#60A5FA]">
              {index + 1}
            </span>
            <p className="text-sm font-semibold text-white">{step.title}</p>
            <p className="text-xs leading-6 text-[#92949D]">{step.text}</p>
          </div>

          {index < steps.length - 1 && <Connector />}
        </Fragment>
      ))}
    </div>
  );
}

// টিক চিহ্নওয়ালা ছোট ব্যাজ (নিরাপত্তা তালিকার প্রতিটি আইটেমের আগে)
function CheckBadge() {
  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#60A5FA]">
      <Icon name="check" size={14} />
    </span>
  );
}

// টোকেনের জীবনচক্রের বারের রং
const TONE_CLASSES = {
  primary: "border-[#3B82F6]/40 bg-[#3B82F6]/15 text-[#93C5FD]",
  muted: "border-[#2d2f36] bg-[#0E0F12] text-[#787878]",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
} as const;

export default function DocumentationPage() {
  return (
    <div
      id="top"
      className="min-h-screen bg-[#0E0F12] font-sans text-[#EAEAEA] selection:bg-[#3B82F6]/30 selection:text-white"
    >
      {/* Navbar: বামে লোগো (হোমে যায়), ডানে Ru'sAuth Docs (পেজের শুরুতে নিয়ে যায়) */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[#2d2f36] bg-[#15161A]/80 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-5xl items-center justify-between gap-4 px-6">
          <Logo />

          <a
            href="#top"
            className="cursor-pointer text-lg font-bold tracking-tight text-white transition-colors hover:text-[#60A5FA]"
          >
            Ru&apos;sAuth{" "}
            <span className="font-medium text-[#3B82F6]">Docs</span>
          </a>
        </div>
      </nav>

      <main className="mx-auto flex max-w-5xl flex-col gap-24 px-6 pb-24 pt-40">
        {/* Hero / Overview */}
        <section id="overview" className="flex scroll-mt-28 flex-col gap-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">
            Documentation
          </p>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Ru&apos;sAuth
          </h1>

          <p className="max-w-3xl text-base leading-8 text-[#92949D] sm:text-lg sm:leading-9">
            Ru&apos;sAuth is a secure authentication system for the web. It
            combines email and password sign in, Google sign in, email OTP
            verification, multi-device session management and a protected admin
            dashboard, all built around defense in depth.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-4">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[#2d2f36] bg-[#15161A] px-5 py-5"
              >
                <p className="text-2xl font-bold text-[#60A5FA]">
                  {item.value}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-[#92949D]">
                  {item.label}
                </p>
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

        {/* Architecture */}
        <section className="flex flex-col gap-10 border-t border-[#2d2f36] pt-20">
          <SectionHeading
            id="architecture"
            eyebrow="Architecture"
            title="System at a glance"
          >
            Every request travels through the same four stops. Each one checks
            it again, so no single layer is trusted on its own.
          </SectionHeading>

          <div className="rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-stretch">
              {ARCHITECTURE.map((node, index) => (
                <Fragment key={node.name}>
                  <div className="flex flex-1 flex-col items-center gap-4 rounded-xl border border-[#2d2f36] bg-[#0E0F12] p-6 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#60A5FA]">
                      <Icon name={node.icon} size={24} />
                    </span>

                    <p className="text-base font-semibold text-white">
                      {node.name}
                    </p>

                    <ul className="flex flex-col gap-1.5">
                      {node.lines.map((line) => (
                        <li
                          key={line}
                          className="text-xs leading-5 text-[#92949D]"
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {index < ARCHITECTURE.length - 1 && <Connector />}
                </Fragment>
              ))}
            </div>

            <div className="mt-8 border-t border-[#2d2f36] pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#787878]">
                Connected services
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {SERVICES.map((service) => (
                  <div
                    key={service.name}
                    className="rounded-lg border border-[#2d2f36] bg-[#0E0F12] px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-white">
                      {service.name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#92949D]">
                      {service.use}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="flex flex-col gap-10 border-t border-[#2d2f36] pt-20">
          <SectionHeading
            id="features"
            eyebrow="Features"
            title="What Ru'sAuth can do"
          >
            Everything a user or an administrator needs to sign in, stay in
            control of their account and manage access safely.
          </SectionHeading>

          <div className="flex flex-col gap-12">
            {FEATURE_GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">
                    {group.title}
                  </h3>
                  <span className="rounded-md border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-0.5 text-xs font-semibold text-[#60A5FA]">
                    {group.features.length}
                  </span>
                  <span className="h-px flex-1 bg-[#2d2f36]" />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {group.features.map((feature) => (
                    <div
                      key={feature.title}
                      className="flex gap-4 rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 transition-colors hover:border-[#3B82F6]/40"
                    >
                      <CheckBadge />

                      <div>
                        <h4 className="text-base font-semibold text-white">
                          {feature.title}
                        </h4>
                        <p className="mt-2 text-sm leading-7 text-[#92949D]">
                          {feature.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Flows */}
        <section className="flex flex-col gap-10 border-t border-[#2d2f36] pt-20">
          <SectionHeading
            id="flows"
            eyebrow="Authentication flows"
            title="How it works"
          >
            Each flow is split into small steps. Every step is checked on the
            server before the next one is allowed.
          </SectionHeading>

          <div className="flex flex-col gap-8">
            {FLOWS.map((flow) => (
              <div
                key={flow.title}
                className="rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 sm:p-8"
              >
                <h3 className="text-lg font-semibold text-white">
                  {flow.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-[#787878]">
                  {flow.summary}
                </p>

                <div className="mt-7 flex flex-col gap-7">
                  {flow.lanes.map((lane, laneIndex) => (
                    <div key={laneIndex} className="flex flex-col gap-3">
                      {lane.label && (
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60A5FA]">
                          {lane.label}
                        </p>
                      )}

                      <Pipeline steps={lane.steps} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        <section className="flex flex-col gap-10 border-t border-[#2d2f36] pt-20">
          <SectionHeading
            id="security"
            eyebrow="Security"
            title="Defense in depth"
          >
            Security is built into every layer: the browser, the edge, the API
            and the database. An attacker has to get past all of them, not just
            one.
          </SectionHeading>

          {/* স্তরভিত্তিক নিরাপত্তার ছবি */}
          <div className="flex flex-col items-stretch rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 sm:p-8">
            {LAYERS.map((layer, index) => (
              <Fragment key={layer.name}>
                <div className="grid gap-5 rounded-xl border border-[#2d2f36] bg-[#0E0F12] p-5 md:grid-cols-[240px_1fr] md:items-center">
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#60A5FA]">
                      <Icon name={layer.icon} size={22} />
                    </span>

                    <div>
                      <p className="text-base font-semibold text-white">
                        {layer.name}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#787878]">
                        {layer.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {layer.controls.map((control) => (
                      <span
                        key={control}
                        className="rounded-md bg-[#15161A] px-3 py-1.5 text-xs font-medium text-[#EAEAEA] ring-1 ring-inset ring-[#2d2f36]"
                      >
                        {control}
                      </span>
                    ))}
                  </div>
                </div>

                {index < LAYERS.length - 1 && (
                  <div className="flex justify-center py-2.5 text-[#3B82F6]">
                    <Icon name="arrowDown" size={20} />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          {/* টোকেনের জীবনচক্র */}
          <div className="rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-white">
              Token lifecycle
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-[#787878]">
              Illustration, not to scale. Default values; all lifetimes are
              configurable.
            </p>

            <div className="mt-7 flex flex-col gap-6">
              {LIFECYCLE.map((row) => (
                <div key={row.name} className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      {row.name}
                    </p>
                    <p className="text-xs text-[#787878]">{row.note}</p>
                  </div>

                  <div className="flex gap-1.5">
                    {row.segments.map((segment) => (
                      <div
                        key={segment.label}
                        style={{ width: `${segment.width}%` }}
                        className={`flex min-h-11 items-center rounded-md border px-3 py-2 text-xs font-medium leading-5 ${TONE_CLASSES[segment.tone]}`}
                      >
                        {segment.label}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* বিস্তারিত তালিকা */}
          <div className="grid gap-6 lg:grid-cols-2">
            {SECURITY_GROUPS.map((group) => (
              <div
                key={group.title}
                className="rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 sm:p-8"
              >
                <h3 className="text-lg font-semibold text-white">
                  {group.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-[#787878]">
                  {group.summary}
                </p>

                <ul className="mt-6 flex flex-col divide-y divide-[#2d2f36]">
                  {group.items.map((item) => (
                    <li
                      key={item.title}
                      className="flex gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <CheckBadge />

                      <div>
                        <p className="text-sm font-semibold text-white">
                          {item.title}
                        </p>
                        <p className="mt-1.5 text-sm leading-7 text-[#92949D]">
                          {item.text}
                        </p>
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
          <SectionHeading
            id="limits"
            eyebrow="Brute-force protection"
            title="Rate limiting"
          >
            Instead of locking accounts, repeated requests are stopped by a
            database-backed rate limiter that works across every server
            instance. Once a limit is passed, further requests are blocked for a
            set time, even with the correct password. Every value is
            configurable through environment variables.
          </SectionHeading>

          <div className="grid gap-6 lg:grid-cols-2">
            {RATE_LIMITS.map((row) => (
              <div
                key={row.who}
                className="flex flex-col gap-6 rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 sm:p-8"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {row.who}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#787878]">
                    Counted by {row.keyedBy.toLowerCase()}
                  </p>
                </div>

                {/* অনুমোদিত রিকোয়েস্টগুলো নীল বর্গ, সীমা পেরোলে লাল ব্লক */}
                <div className="flex flex-wrap items-center gap-2">
                  {Array.from({ length: row.max }).map((_, index) => (
                    <span
                      key={index}
                      className="h-5 w-5 rounded-md border border-[#3B82F6]/50 bg-[#3B82F6]/20"
                    />
                  ))}

                  <span className="ml-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300">
                    Blocked
                  </span>
                </div>

                <dl className="grid grid-cols-3 gap-3 border-t border-[#2d2f36] pt-6">
                  <div>
                    <dt className="text-xs text-[#787878]">Allowed</dt>
                    <dd className="mt-1.5 text-sm font-semibold text-white">
                      {row.max} requests
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#787878]">Within</dt>
                    <dd className="mt-1.5 text-sm font-semibold text-white">
                      {row.window}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#787878]">Then blocked</dt>
                    <dd className="mt-1.5 text-sm font-semibold text-white">
                      {row.block}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <p className="text-sm leading-7 text-[#787878]">
            User limits cover every authentication form: email, login,
            registration, OTP verification, resend, forgot password, new
            password, and add or change password. The numbers above are the
            defaults.
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
                <p className="mt-1 text-sm text-[#92949D]">
                  Developer of Ru&apos;sAuth
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* পোর্টফোলিও লিংক */}
              <a
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#3B82F6] bg-[#3B82F6] px-4 text-sm font-medium text-white transition-colors hover:bg-transparent hover:text-[#60A5FA]"
              >
                <Icon name="globe" size={20} />
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
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-[#2d2f36] bg-[#0E0F12] text-[#92949D] transition-colors hover:border-[#3B82F6] hover:text-[#3B82F6]"
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

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Camera,
  Check,
  Clock4,
  Database,
  Globe,
  Lock,
  Logout,
  Mail,
  Monitor,
  Refresh,
  Trash,
  User,
} from "@mynaui/icons-react";

import Logo from "@/app/component/Logo";

export const metadata: Metadata = {
  title: "Documentation - Ru'sAuth",
  description:
    "Every feature, sign-in flow and security protection in Ru'sAuth, explained simply.",
};

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* Everything shown on the page lives here, so it is easy to edit.     */
/* ------------------------------------------------------------------ */

const PORTFOLIO_URL = "https://rubayet.vercel.app";

const DEVELOPER = {
  name: "Rowshan Rubayet",
  initials: "RR",
  role: "Full-stack developer",
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

const SECTIONS = [
  { id: "features", label: "Features" },
  { id: "flows", label: "How it works" },
  { id: "sessions", label: "Sessions" },
  { id: "security", label: "Security" },
  { id: "admin", label: "Admin" },
  { id: "developer", label: "Developer" },
];

const HIGHLIGHTS = [
  { value: "7", label: "Guided account flows" },
  { value: "10 days", label: "Stay signed in without a password" },
  { value: "3 sec", label: "Sign-out reaches every tab" },
  { value: "16", label: "Built-in security protections" },
];

type IconType = typeof Mail;

const FEATURES: { icon: IconType; title: string; text: string }[] = [
  {
    icon: User,
    title: "Create an account",
    text: "Sign up with a username, email and password on one simple page.",
  },
  {
    icon: Globe,
    title: "Google sign-in",
    text: "Skip the password and continue with your Google account in one click.",
  },
  {
    icon: Mail,
    title: "Email confirmation",
    text: "A 6-digit code proves the email address really belongs to you.",
  },
  {
    icon: Refresh,
    title: "Forgot password",
    text: "Get a code by email and choose a new password in under a minute.",
  },
  {
    icon: Lock,
    title: "Add or change password",
    text: "Google users can add a password; everyone can change theirs safely.",
  },
  {
    icon: Camera,
    title: "Profile photo",
    text: "Upload, crop, zoom, replace or remove your photo whenever you like.",
  },
  {
    icon: Monitor,
    title: "Device manager",
    text: "See every device signed in to your account and sign any of them out.",
  },
  {
    icon: Clock4,
    title: "Stay signed in",
    text: "Come back any time within 10 days and you're still logged in.",
  },
  {
    icon: Trash,
    title: "Permanent deletion",
    text: "Delete your account and everything about you is erased for good.",
  },
];

type Flow = {
  title: string;
  icon: IconType;
  steps: { title: string; text: string }[];
  note: string;
};

const FLOWS: Flow[] = [
  {
    title: "Creating an account",
    icon: User,
    steps: [
      { title: "Sign up", text: "Enter a username, email and password." },
      { title: "Check your email", text: "A 6-digit code is sent to you." },
      { title: "Enter the code", text: "Your email is now confirmed." },
      { title: "You're in", text: "You're signed in automatically." },
    ],
    note: "Sign-ups that are never confirmed expire after 30 minutes and never appear in the admin list.",
  },
  {
    title: "Logging in",
    icon: Lock,
    steps: [
      { title: "Log in", text: "Enter your email and password together." },
      { title: "Checked securely", text: "Your password is verified." },
      { title: "You're in", text: "This device stays signed in." },
    ],
    note: "If the email was never confirmed, a code is sent first and you continue from there.",
  },
  {
    title: "Signing in with Google",
    icon: Globe,
    steps: [
      { title: "Continue with Google", text: "Pick your Google account." },
      { title: "Google confirms", text: "Your email is already verified." },
      { title: "You're in", text: "No code or password needed." },
    ],
    note: "If you already have an account with the same email, Google is linked to it.",
  },
  {
    title: "Forgot password",
    icon: Refresh,
    steps: [
      { title: "Enter your email", text: "From the login page." },
      { title: "Get a code", text: "Sent only if the account exists." },
      { title: "New password", text: "Choose and confirm it." },
      { title: "Fresh start", text: "Every device is signed out." },
    ],
    note: "The page answers the same way for every email, so nobody can check who has an account.",
  },
  {
    title: "Adding or changing a password",
    icon: Lock,
    steps: [
      { title: "Open your profile", text: "Choose add or change password." },
      { title: "Confirm it's you", text: "Enter the code sent to your email." },
      { title: "Set the password", text: "It's saved securely." },
      { title: "Others signed out", text: "This device stays signed in." },
    ],
    note: "Google accounts can add a password, so they can also log in with email and password.",
  },
  {
    title: "Adding or updating a profile photo",
    icon: Camera,
    steps: [
      { title: "Choose a photo", text: "PNG, JPEG or JPG, up to 10 MB." },
      { title: "Crop and zoom", text: "Drag, pinch or zoom up to 4×." },
      { title: "Secure upload", text: "Sent straight to Cloudinary." },
      { title: "Old photo removed", text: "Only your new photo is kept." },
    ],
    note: "You can remove your photo at any time, and it is deleted from storage too.",
  },
  {
    title: "Deleting your account",
    icon: Trash,
    steps: [
      { title: "Confirm", text: "From your profile page." },
      { title: "Photo deleted", text: "Removed from Cloudinary first." },
      { title: "Account erased", text: "All your data is gone for good." },
    ],
    note: "Every device is signed out at once. Nothing is kept, so it cannot be undone.",
  },
];

const SESSION_NUMBERS = [
  { value: "15 min", label: "Access pass, renewed quietly" },
  { value: "10 days", label: "Stay signed in between visits" },
  { value: "3 sec", label: "Sign-out reaches other tabs" },
  { value: "2 min", label: "Recovery window for renewals" },
];

const SESSION_POINTS: { icon: IconType; title: string; text: string }[] = [
  {
    icon: Clock4,
    title: "Automatic login",
    text: "Close the browser and come back within 10 days: you're still signed in, no password needed. Each visit extends it.",
  },
  {
    icon: Refresh,
    title: "Silent renewal",
    text: "Your access renews in the background before it expires. With many tabs open, only one renews it for all of them.",
  },
  {
    icon: Monitor,
    title: "Every device listed",
    text: "Each login shows its browser, device type, IP address and time, so you can spot anything you don't recognise.",
  },
  {
    icon: Logout,
    title: "Sign out from anywhere",
    text: "End one device or all others at once. The change takes effect within seconds, even in other open tabs.",
  },
  {
    icon: Lock,
    title: "Password change locks others out",
    text: "Changing or resetting your password signs out every other device, so an old login can't be used against you.",
  },
  {
    icon: Check,
    title: "Survives bad connections",
    text: "If a renewal is cut off by a closed tab or lost signal, the app recovers on its own instead of logging you out.",
  },
];

const SECURITY_GROUPS: {
  title: string;
  items: { title: string; text: string; tech: string }[];
}[] = [
  {
    title: "Passwords and codes",
    items: [
      {
        title: "Passwords are never stored",
        text: "Only a scrambled fingerprint is kept. Nobody can read your password, not even the database owner.",
        tech: "bcrypt",
      },
      {
        title: "Codes expire fast",
        text: "Email codes last 5 minutes, allow 5 tries and can be resent after 60 seconds.",
        tech: "One-time codes",
      },
      {
        title: "Codes are locked to you",
        text: "Each code works only for your account and its purpose, and is stored scrambled with a secret key.",
        tech: "HMAC hashing",
      },
      {
        title: "Reset links work once",
        text: "A password-reset step can't be replayed after the password has changed.",
        tech: "Single-use tokens",
      },
    ],
  },
  {
    title: "Login protection",
    items: [
      {
        title: "Password guessing is blocked",
        text: "Too many attempts from one email or one device are paused for a while, even with the right password.",
        tech: "Rate limiting",
      },
      {
        title: "No hints for attackers",
        text: "Wrong emails and wrong passwords get the same answer in the same time.",
        tech: "Uniform responses",
      },
      {
        title: "Email takeover prevented",
        text: "Re-registering an unconfirmed email cancels the old attempt, so nobody can trick you into confirming their account.",
        tech: "Pre-hijack protection",
      },
      {
        title: "Stolen logins are detected",
        text: "Your sign-in key changes on every renewal. If an old key is reused, that login is shut down.",
        tech: "Token rotation",
      },
    ],
  },
  {
    title: "Browser protection",
    items: [
      {
        title: "Sign-in hidden from scripts",
        text: "Your login lives in a protected cookie that page scripts can't read and other sites can't send.",
        tech: "HttpOnly, SameSite",
      },
      {
        title: "Other sites can't act for you",
        text: "Every action must come from this site, so a fake page can't use your login.",
        tech: "CSRF checks",
      },
      {
        title: "Harmful code is blocked",
        text: "The site only loads content from trusted sources, and all text is shown safely.",
        tech: "CSP, XSS defence",
      },
      {
        title: "Always encrypted",
        text: "Connections are forced to HTTPS and the site can't be hidden inside another page.",
        tech: "HSTS, frame denial",
      },
    ],
  },
  {
    title: "Data protection",
    items: [
      {
        title: "Safe database queries",
        text: "Typed input is never treated as a command, which stops database attacks.",
        tech: "Parameterized SQL",
      },
      {
        title: "Encrypted database link",
        text: "The connection to the database is encrypted and its identity is verified.",
        tech: "Verified TLS",
      },
      {
        title: "Photos stay yours",
        text: "Uploads must be approved by the server and can only replace your own photo.",
        tech: "Signed uploads",
      },
      {
        title: "Nothing left behind",
        text: "Deleted accounts, expired codes and abandoned sign-ups are erased, never archived.",
        tech: "Hard deletion",
      },
    ],
  },
];

const ADMIN_POINTS = [
  "A separate admin login with its own stricter limits (5 tries per 10 minutes)",
  "Admin sessions are kept apart from user sessions and can't be mixed up",
  "Live dashboard of verified users and signed-in admin devices",
  "Sign out any admin device, or all others, in one click",
  "One-click cleanup of expired codes, abandoned sign-ups and old limiter records",
];

const TECH_STACK = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind CSS",
  "PostgreSQL (Neon)",
  "JWT (jose)",
  "bcrypt",
  "Zustand",
  "Nodemailer",
  "Cloudinary",
  "Google OAuth",
  "Vercel",
];

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

const card = "border border-[#2d2f36] bg-[#14141d]";
const innerCard = "border border-[#2d2f36] bg-[#0E0F12]";

function IconBox({ icon: Icon }: { icon: IconType }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#0567E3]/40 bg-[#0567E3]/10 text-[#0567E3]">
      <Icon size={20} stroke={1.5} />
    </span>
  );
}

function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="flex scroll-mt-24 flex-col gap-8 border-t border-[#2d2f36] pt-16"
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0567E3]">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {intro && (
          <p className="max-w-2xl text-sm leading-7 text-[#A7B8C2] sm:text-base">
            {intro}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

function NumberCard({ value, label }: { value: string; label: string }) {
  return (
    <div className={`${card} p-4 sm:p-5`}>
      <p className="text-xl font-bold text-[#0567E3] sm:text-2xl">{value}</p>
      <p className="mt-1.5 text-xs leading-5 text-[#A7B8C2]">{label}</p>
    </div>
  );
}

function StepArrow() {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center py-1 text-[#0567E3] md:px-2 md:py-0"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="rotate-90 md:rotate-0"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </span>
  );
}

function CheckMark() {
  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-[#0567E3]/50 bg-[#0567E3]/10 text-[#0567E3]">
      <Check size={14} stroke={2} />
    </span>
  );
}

function SocialIcon({ label }: { label: string }) {
  const common = {
    width: 18,
    height: 18,
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

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DocumentationPage() {
  return (
    <div id="top" className="min-h-screen bg-[#11111B] text-[#FBFDFC]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#2d2f36] bg-[#11111B]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />

          <Link
            href="/"
            className="flex shrink-0 items-center justify-center border border-[#0567E3] bg-[#0567E3]/20 px-3 py-2 text-xs font-medium transition-colors hover:bg-transparent sm:px-4 sm:text-sm"
          >
            Back to home
          </Link>
        </div>
      </nav>

      <main className="mx-auto flex max-w-5xl flex-col gap-16 px-4 pb-20 pt-32 sm:px-6 sm:pt-36">
        {/* Overview */}
        <header className="flex flex-col gap-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0567E3]">
            Documentation
          </p>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Ru&apos;s<span className="text-[#0567E3]">Auth</span>
          </h1>

          <p className="max-w-2xl text-base leading-8 text-[#A7B8C2] sm:text-lg">
            Ru&apos;sAuth is a secure login system. It takes care of everything
            around your account: signing up, logging in, confirming your email,
            recovering a forgotten password, managing your profile photo and
            keeping track of the devices you use, with security built into
            every step.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 md:grid-cols-4">
            {HIGHLIGHTS.map((item) => (
              <NumberCard key={item.label} {...item} />
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="border border-[#2d2f36] bg-[#14141d] px-3 py-1.5 text-sm text-[#A7B8C2] transition-colors hover:border-[#0567E3] hover:text-[#FBFDFC]"
              >
                {section.label}
              </a>
            ))}
          </div>
        </header>

        {/* Features */}
        <Section
          id="features"
          eyebrow="Features"
          title="What you can do"
          intro="Everything you need to create an account and stay in control of it."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={`${card} flex flex-col gap-4 p-5 transition-colors hover:border-[#0567E3]/50`}
              >
                <IconBox icon={feature.icon} />

                <div>
                  <h3 className="text-base font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#A7B8C2]">
                    {feature.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Flows */}
        <Section
          id="flows"
          eyebrow="How it works"
          title="Every flow, step by step"
          intro="Each step is checked by the server before the next one opens, so no step can be skipped."
        >
          <div className="flex flex-col gap-4">
            {FLOWS.map((flow) => (
              <div key={flow.title} className={`${card} p-5 sm:p-6`}>
                <div className="flex items-center gap-3">
                  <IconBox icon={flow.icon} />
                  <h3 className="text-base font-semibold sm:text-lg">
                    {flow.title}
                  </h3>
                </div>

                <ol className="mt-5 flex flex-col md:flex-row md:items-stretch">
                  {flow.steps.map((step, index) => (
                    <li
                      key={step.title}
                      className="flex flex-col md:flex-1 md:flex-row"
                    >
                      <div
                        className={`${innerCard} flex flex-1 items-center justify-center gap-3 p-4`}
                      >

                        <div className="flex flex-col items-center justify-center text-center">
                          <p className="text-sm font-semibold">{step.title}</p>
                          <p className="mt-1 text-xs leading-5 text-[#A7B8C2]">
                            {step.text}
                          </p>
                        </div>
                      </div>

                      {index < flow.steps.length - 1 && <StepArrow />}
                    </li>
                  ))}
                </ol>

                <p className="mt-4 border-l-2 border-[#0567E3] pl-3 text-xs leading-5 text-[#A7B8C2] sm:text-sm sm:leading-6">
                  {flow.note}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Sessions */}
        <Section
          id="sessions"
          eyebrow="Sessions"
          title="Stay signed in, stay in control"
          intro="A session is one device where you're logged in. It keeps you signed in automatically, and you can end it at any time."
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {SESSION_NUMBERS.map((item) => (
              <NumberCard key={item.label} {...item} />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {SESSION_POINTS.map((point) => (
              <div key={point.title} className={`${card} flex flex-col gap-4 p-5`}>
                <IconBox icon={point.icon} />

                <div>
                  <h3 className="text-base font-semibold">{point.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#A7B8C2]">
                    {point.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Security */}
        <Section
          id="security"
          eyebrow="Security"
          title="How your account is protected"
          intro="Protection is built into every layer: your browser, the server and the database. Getting past one layer is never enough."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {SECURITY_GROUPS.map((group) => (
              <div key={group.title} className={`${card} flex flex-col`}>
                <h3 className="border-b border-[#2d2f36] px-5 py-4 text-base font-semibold sm:px-6">
                  {group.title}
                </h3>

                <ul className="flex flex-col divide-y divide-[#2d2f36]">
                  {group.items.map((item) => (
                    <li key={item.title} className="flex gap-4 px-5 py-4 sm:px-6">
                 

                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <div className="border border-[#2d2f36] bg-[#0E0F12] px-2 py-0.75 text-[11px] font-medium text-[#A7B8C2]">
                            <p className="leading-none mb-px">{item.tech}</p>
                          </div>
                        </div>
                        <p className="text-sm leading-6 text-[#A7B8C2]">
                          {item.text}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Admin */}
        <Section
          id="admin"
          eyebrow="Admin"
          title="For the administrator"
          intro="A separate, locked-down area for running the system."
        >
          <div className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
       <div className="flex items-center justify-start gap-3">     <IconBox icon={Database} />

           
              <h3 className="text-lg leading-none font-semibold">For the administrator</h3>
</div>
              <ul className="flex flex-col gap-2">
                {ADMIN_POINTS.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2 text-sm leading-6 text-[#A7B8C2]"
                  >
                    <Check
                      size={16}
                      stroke={2}
                      className="mt-1 shrink-0 text-[#0567E3]"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
         
        </Section>

        {/* Tech stack */}
        <Section id="stack" eyebrow="Built with" title="Technology">
          <div className="flex flex-wrap gap-2">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className={`${card} px-3 py-1.5 text-sm text-[#FBFDFC]`}
              >
                {tech}
              </span>
            ))}
          </div>
        </Section>

        {/* Developer */}
        <Section id="developer" eyebrow="Developer" title="Built by">
          <div
            className={`${card} flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-center md:justify-between`}
          >
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center border border-[#0567E3]/50 bg-[#0567E3]/10 text-lg font-bold text-[#0567E3]">
                {DEVELOPER.initials}
              </span>

              <div>
                <p className="text-lg font-bold">{DEVELOPER.name}</p>
                <p className="mt-1 text-sm text-[#A7B8C2]">{DEVELOPER.role}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center gap-2 border border-[#0567E3] bg-[#0567E3] px-4 text-sm font-medium transition-colors hover:bg-transparent hover:text-[#0567E3]"
              >
                <Globe size={18} stroke={1.5} />
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
                  className="flex h-10 w-10 items-center justify-center border border-[#2d2f36] bg-[#0E0F12] text-[#A7B8C2] transition-colors hover:border-[#0567E3] hover:text-[#0567E3]"
                >
                  <SocialIcon label={link.label} />
                </a>
              ))}
            </div>
          </div>
        </Section>
      </main>

      <footer className="border-t border-[#2d2f36] py-6">
        <p className="mx-auto max-w-5xl px-4 text-center text-sm text-[#A7B8C2] sm:px-6">
          Ru&apos;sAuth &middot; Designed and developed by {DEVELOPER.name}
        </p>
      </footer>
    </div>
  );
}

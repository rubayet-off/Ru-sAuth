import nodemailer from "nodemailer";

import { isProduction } from "@/lib/env";

interface MailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const hasCredentials = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

// Gmail ক্রেডেনশিয়াল থাকলে আসল ইমেইল যায়, dev মোডে না থাকলে ইমেইল শুধু টার্মিনালে প্রিন্ট হয়
const transporter = hasCredentials
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : nodemailer.createTransport({ jsonTransport: true });

// HTML এ বসানোর আগে বিশেষ অক্ষর escape করে
export function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return value.replace(/[&<>"']/g, (char) => entities[char]);
}

// ইমেইল পাঠায়; প্রোডাকশনে ক্রেডেনশিয়াল না থাকলে এরর দেয়
export async function sendMail(input: MailInput): Promise<void> {
  if (!hasCredentials && isProduction) {
    throw new Error("EMAIL_USER and EMAIL_PASS are not configured.");
  }

  await transporter.sendMail({
    from: `"Ru'sAuth" <${process.env.EMAIL_USER ?? "no-reply@rusauth.local"}>`,
    ...input,
  });

  if (!hasCredentials) {
    console.log(`[dev mail] To: ${input.to} | ${input.subject}\n${input.text}`);
  }
}
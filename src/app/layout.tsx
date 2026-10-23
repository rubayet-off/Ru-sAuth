import type { Metadata } from "next";

import Toast from "@/toast/Toast";

import AuthSync from "./component/AuthSync";

import "./globals.css";

export const metadata: Metadata = {
  title: "Ru'sAuth",
  description: "A secured authentication and profile management system",
};

// সব পেজের মূল কাঠামো; টোস্ট ও AuthSync এখানে থাকায় যেকোনো পেজে এগুলো কাজ করে
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
        <Toast />

        {/* সব ট্যাব ও ডিভাইসের লগইন অবস্থা, ছবি ও নাম রিয়েল টাইমে মিলিয়ে রাখে */}
        <AuthSync />
      </body>
    </html>
  );
}

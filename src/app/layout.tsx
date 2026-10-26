import type { Metadata } from "next";

import Toast from "@/toast/Toast";
import AuthSync from "./component/AuthSync";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ru'sAuth",
  description: "A secured authentication and profile management system",
};

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
        <AuthSync />
      </body>
    </html>
  );
}

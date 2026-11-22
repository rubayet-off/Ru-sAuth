import type { Metadata } from "next";
import "./globals.css";

import AuthSync from "./component/AuthSync";
import Toast from "@/toast/Toast";

export const metadata: Metadata = {
  title: "Ru'sAuth",
  description: "A secured authentication and profile management system",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}

        {/* Global, so toasts survive route changes and show on every page
            (admin cleanup, logout, login...). Neither was mounted before,
            which is why no toast ever appeared. */}
        <Toast />
        <AuthSync />
      </body>
    </html>
  );
}

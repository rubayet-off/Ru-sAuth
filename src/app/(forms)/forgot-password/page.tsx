import AuthCard from "@/app/component/AuthCard";

import ForgotClient from "./ForgotClient";

// পাসওয়ার্ড ভুলে গেলে ইমেইল দেওয়ার পেজ
export default function ForgotPasswordPage() {
  return (
    <AuthCard>
      <ForgotClient />
    </AuthCard>
  );
}

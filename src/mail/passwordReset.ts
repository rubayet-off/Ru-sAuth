import { renderOtpEmail } from "./otpTemplate";
import { sendMail } from "./transporter";

// পাসওয়ার্ড রিসেটের OTP ইমেইল পাঠায়
export async function passwordReset(
  email: string,
  otp: string,
  expiryMinutes: number,
): Promise<void> {
  await sendMail({
    to: email,
    subject: "Password reset code - Ru'sAuth",
    text: `Your Ru'sAuth password reset code is ${otp}. It expires in ${expiryMinutes} minutes. If you did not request a password reset, ignore this email.`,
    html: renderOtpEmail({
      otp,
      expiryMinutes,
      heading: "Reset your password",
      intro:
        "We received a request to reset your Ru'sAuth password. Use the code below to verify your request and continue resetting your password.",
      codeLabel: "YOUR PASSWORD RESET CODE",
      securityNote:
        "Never share it with anyone, even if they claim to represent Ru'sAuth.",
      ignoreNote:
        "If you didn't request a password reset, ignore this email. Your password will remain unchanged.",
    }),
  });
}
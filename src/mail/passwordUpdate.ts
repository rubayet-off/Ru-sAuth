import { renderOtpEmail } from "./otpTemplate";
import { sendMail } from "./transporter";

// লগইন করা ব্যবহারকারীর পাসওয়ার্ড যোগ বা বদলানোর OTP ইমেইল পাঠায়
export async function passwordUpdate(
  email: string,
  otp: string,
  expiryMinutes: number,
  action: "add" | "change",
): Promise<void> {
  const isAdd = action === "add";

  await sendMail({
    to: email,
    subject: isAdd
      ? "Add password code - Ru'sAuth"
      : "Change password code - Ru'sAuth",
    text: `Your Ru'sAuth ${isAdd ? "add password" : "change password"} code is ${otp}. It expires in ${expiryMinutes} minutes. If this was not you, ignore this email.`,
    html: renderOtpEmail({
      otp,
      expiryMinutes,
      heading: isAdd ? "Add a password" : "Change your password",
      intro: isAdd
        ? "You asked to add a password to your Ru'sAuth account. Use the code below to confirm that it's you."
        : "You asked to change the password of your Ru'sAuth account. Use the code below to confirm that it's you.",
      codeLabel: isAdd ? "YOUR ADD PASSWORD CODE" : "YOUR CHANGE PASSWORD CODE",
      securityNote:
        "Never share it with anyone, even if they claim to represent Ru'sAuth.",
      ignoreNote: isAdd
        ? "If you didn't request this, ignore this email. No password will be added."
        : "If you didn't request this, ignore this email. Your password will remain unchanged.",
    }),
  });
}

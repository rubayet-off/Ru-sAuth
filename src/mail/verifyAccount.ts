import { renderOtpEmail } from "./otpTemplate";
import { sendMail } from "./transporter";

export async function verifyAccount(
  email: string,
  otp: string,
  expiryMinutes: number,
): Promise<void> {
  await sendMail({
    to: email,
    subject: "Verify your Ru'sAuth account",
    text: `Your Ru'sAuth verification code is ${otp}. It expires in ${expiryMinutes} minutes. If you did not request this, ignore this email.`,
    html: renderOtpEmail({
      otp,
      expiryMinutes,
      heading: "Verify your email address",
      intro:
        "Welcome to Ru'sAuth! Enter the verification code below to confirm your email address and continue.",
      codeLabel: "YOUR VERIFICATION CODE",
      securityNote:
        "For your security, do not share this code with anyone.",
      ignoreNote:
        "Didn't create a Ru'sAuth account? You can safely ignore this email.",
    }),
  });
}
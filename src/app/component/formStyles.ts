// ফর্মের বাটন ও লিংকের Tailwind ক্লাস এক জায়গায় রাখা হয়েছে, যাতে সব পেজে একই ডিজাইন থাকে

// নীল প্রধান বাটন
export const primaryButtonClass =
  "flex w-full cursor-pointer items-center justify-center gap-2 border border-[#3B82F6] bg-[#3B82F6] py-2.5 text-sm text-white transition-colors hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-60";

// ধূসর দ্বিতীয় বাটন (Google, Resend ইত্যাদি)
export const secondaryButtonClass =
  "flex w-full cursor-pointer items-center justify-center gap-2 border border-[#787878] bg-[#15161A] py-2.5 text-sm text-white transition-colors hover:border-[#3B82F6] hover:text-[#3B82F6] disabled:cursor-not-allowed disabled:opacity-60";

// নীল টেক্সট লিংক
export const linkClass =
  "text-sm text-[#3B82F6] transition-colors hover:underline";

// ইনপুটের বাইরের বর্ডার ঘর
export const fieldWrapperClass =
  "flex items-center gap-2 border border-gray-300 px-3 py-2.5 transition-colors focus-within:border-[#3B82F6]";

// ইনপুটের নিজস্ব ক্লাস
export const fieldInputClass =
  "w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-gray-300";

// নির্বাচিত ইমেইল দেখানোর ধূসর ঘর
export const emailBoxClass =
  "flex items-center justify-between gap-3 border border-transparent bg-[#1f2026] px-3 py-2.5";

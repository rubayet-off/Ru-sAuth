import { FileText } from "@mynaui/icons-react";
import Link from "next/link";
import Logo from "./Logo";

const Navbar = () => {
  return (
    <nav className="relative z-20 flex w-full flex-none items-center justify-between gap-3 border-b border-[#2d2f36] bg-[#15161A] px-4 py-3 shadow-sm sm:px-6 sm:py-4 md:px-20 md:py-5">
      <Logo />

      <Link
        href="/documentation"
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#3B82F6]/50 bg-[#3B82F6]/10 px-2.5 py-2 text-xs font-medium text-white transition-colors hover:bg-transparent sm:gap-2 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
      >
        <FileText size={16} stroke={1.5} className="mb-px sm:hidden" />
        <FileText size={18} stroke={1.5} className="mb-px hidden sm:block" />
        <span className="mb-0.5 leading-none">Documentation</span>
      </Link>
    </nav>
  );
};

export default Navbar;

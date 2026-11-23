import { FileText } from "@mynaui/icons-react";
import Link from "next/link";
import Logo from "./Logo";

const Navbar = () => {
  return (
    <nav className="relative bg-[#14141D] z-20 flex w-full flex-none items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 md:px-20 md:py-5">
      <Logo />

      <Link
        href="/documentation"
        className="flex shrink-0 items-center justify-center gap-1.5 border border-[#0567E3] bg-[#0567E3]/20 hover:bg-transparent px-2.5 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
      >
        <FileText size={16} stroke={1.5} className="mb-px sm:hidden" />
        <FileText size={18} stroke={1.5} className="mb-px hidden sm:block" />
        <span className="mb-0.5 leading-none">Documentation</span>
      </Link>
    </nav>
  );
};

export default Navbar;

import Link from "next/link";

const Logo = () => {
  return (
    <Link
      href="/"
      className="group flex w-fit shrink-0 cursor-pointer select-none flex-col items-start gap-1"
    >
      <div className="flex items-baseline text-xl font-extrabold leading-none tracking-tight sm:text-2xl">
        <span className="text-[#3B82F6] transition-colors duration-300 group-hover:brightness-125">
          Ru&apos;s
        </span>
        <span className="text-white">Auth</span>
        <span className="mb-0.5 ml-1 h-1 w-1 rounded-full bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.8)] sm:h-1.5 sm:w-1.5 animate-pulse" />
      </div>

      <div className="h-0.5 w-full rounded-full bg-[#3B82F6] transition-all duration-300 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.6)]" />

      <p className="text-[10px] font-medium leading-none tracking-wide text-gray-300 sm:text-xs">
        Safer Than Condoms
      </p>
    </Link>
  );
};

export default Logo;

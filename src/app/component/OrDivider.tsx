// দুই অপশনের মাঝের "OR" রেখা
export default function OrDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`${className} flex items-center gap-3 text-xs leading-none text-gray-300`.trim()}
    >
      <div className="h-px flex-1 bg-[#787878]" />
      <span className="font-semibold">OR</span>
      <div className="h-px flex-1 bg-[#787878]" />
    </div>
  );
}

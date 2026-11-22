export default function OrDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`${className} flex items-center gap-3 text-xs leading-none text-[#5E6D80]`.trim()}
    >
      <div className="h-px flex-1 bg-[#5E6D80]" />
      <span className="font-semibold">OR</span>
      <div className="h-px flex-1 bg-[#5E6D80]" />
    </div>
  );
}

import type { ReactNode } from "react";
import { linkClass } from "./formStyles";

export default function RestartFlowLink({
  children,
  className = linkClass,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <a 
      href="/api/auth/clear-cookie?scope=flow&next=%2Femail"
      className={className}
    >
      {children}
    </a>
  );
}

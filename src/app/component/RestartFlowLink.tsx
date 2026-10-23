import type { ReactNode } from "react";

import { linkClass } from "./formStyles";

// "Change" ও "Try with another credential" লিংক
// সাধারণ লিংক নয়, কারণ আগের ধাপের flow কুকি মুছে তারপর ইমেইল পেজে নিতে হয়
// সার্ভারের এই রুট কুকি মুছে /email এ পাঠায়, তাই আগের টোকেন আর পথ আটকাতে পারে না
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

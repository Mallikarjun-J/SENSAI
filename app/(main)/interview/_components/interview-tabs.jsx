"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, ClipboardList } from "lucide-react";

const LINKS = [
  { href: "/interview",       label: "Quiz Practice",   icon: ClipboardList },
  { href: "/interview/voice", label: "Voice Interview", icon: Mic },
];

export default function InterviewNav() {
  const pathname = usePathname();

  // Voice tab is active for /interview/voice and sub-paths (but NOT /interview/voice/new setup form)
  const active = pathname.startsWith("/interview/voice") ? "/interview/voice" : "/interview";

  return (
    <div className="flex items-center gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/8 w-full sm:w-fit">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const isActive = active === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 sm:flex-none items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              isActive
                ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/20"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

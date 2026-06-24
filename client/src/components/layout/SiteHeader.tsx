import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Home, Library as LibraryIcon, LogOut, type LucideIcon } from "lucide-react";
import { DecoDocLogo } from "../ui/decodoc-logo";
import { cn } from "../../lib/utils";
import { useAuth } from "../../lib/auth-context";
import { navigateTo, SIGN_IN_PATH, SIGN_UP_PATH } from "../../lib/auth-nav";
import type { ActivePage } from "../../lib/app-utils";
import type { UsageStatus } from "../../lib/api";

const NAV_ITEMS: { name: string; page: "home" | "library"; icon: LucideIcon }[] = [
  { name: "Home", page: "home", icon: Home },
  { name: "Library", page: "library", icon: LibraryIcon },
];

export type SiteHeaderProps = {
  activePage: ActivePage;
  onNavigate: (page: "home" | "library") => void;
  usage?: UsageStatus | null;
};

function UserInitials({ email, name }: { email: string | null; name: string | null }) {
  const source = name || email || "?";
  const parts = source.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : source.slice(0, 2).toUpperCase();
  return <span className="auth-user-avatar">{initials}</span>;
}

export function SiteHeader({ activePage, onNavigate, usage }: SiteHeaderProps) {
  const { isSignedIn, user, logout } = useAuth();
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = lastScrollY.current;
    const delta = current - previous;
    if (current < 72) setVisible(true);
    else if (delta < -6) setVisible(true);
    else if (delta > 6) setVisible(false);
    lastScrollY.current = current;
  });

  useEffect(() => {
    lastScrollY.current = scrollY.get();
  }, [scrollY]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <AnimatePresence mode="wait">
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: visible ? 0 : -72, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
        className="site-header"
      >
        <div className="site-header-inner">
          <button
            type="button"
            className="site-header-logo rounded-lg border-0 bg-transparent p-0 cursor-pointer"
            onClick={() => onNavigate("home")}
            aria-label="DecoDoc home"
          >
            <DecoDocLogo monochrome />
          </button>

          <nav aria-label="Primary" className="site-header-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                activePage === item.page || (item.page === "home" && activePage === "paper-detail");
              return (
                <button
                  key={item.page}
                  type="button"
                  className={cn("site-header-nav-item", isActive && "is-active")}
                  onClick={() => onNavigate(item.page)}
                  aria-label={item.name}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {usage && !usage.authenticated && (
              <span className="hidden md:inline text-caption text-[var(--color-fossil-gray)]">
                {usage.remaining === usage.limit
                  ? `${usage.limit} free analyses`
                  : `${usage.remaining} free ${usage.remaining === 1 ? "analysis" : "analyses"} left`}
              </span>
            )}
            {usage && usage.authenticated && (
              <span className="hidden md:inline text-caption text-[var(--color-fossil-gray)]">
                {usage.remaining} of {usage.limit} today
              </span>
            )}

            {isSignedIn && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className="auth-user-menu border-0 bg-transparent cursor-pointer p-0"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <UserInitials email={user.email} name={user.displayName} />
                  <span className="auth-user-email">{user.email}</span>
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 min-w-[10rem] rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg z-50"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-caption text-[var(--color-fossil-gray)] hover:bg-[var(--color-blush-paper)] hover:text-[var(--color-carbon-ink)] border-0 bg-transparent cursor-pointer"
                      onClick={() => {
                        setMenuOpen(false);
                        void logout();
                      }}
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost text-caption font-semibold px-3 py-1.5 hidden sm:inline-flex"
                  onClick={() => navigateTo(SIGN_IN_PATH)}
                >
                  Log in
                </button>
                <button
                  type="button"
                  className="btn-primary text-caption font-semibold px-3.5 py-1.5 !text-sm"
                  onClick={() => navigateTo(SIGN_UP_PATH)}
                >
                  Get started
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.header>
    </AnimatePresence>
  );
}

import {
  Atom,
  BookOpen,
  Cpu,
  FlaskConical,
  Microscope,
  Sigma,
} from "lucide-react";
import { detectDomain } from "@decodoc/shared";

const DOMAIN_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  cs: { label: "Computer Science", icon: Cpu },
  math: { label: "Mathematics", icon: Sigma },
  biology: { label: "Biology", icon: Microscope },
  chemistry: { label: "Chemistry", icon: FlaskConical },
  physics: { label: "Physics", icon: Atom },
  general: { label: "General Research", icon: BookOpen },
};

export function DomainBadge({ title, abstract }: { title: string; abstract?: string }) {
  const domain = detectDomain(title, abstract);
  const config = DOMAIN_CONFIG[domain] ?? DOMAIN_CONFIG.general;
  const Icon = config.icon;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-carbon-ink)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {config.label}
    </span>
  );
}

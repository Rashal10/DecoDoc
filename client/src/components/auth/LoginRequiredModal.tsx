import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { EmailAuthForm } from "./EmailAuthForm";

type LoginRequiredModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginRequiredModal({ open, onClose }: LoginRequiredModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="auth-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="auth-modal-panel" ref={panelRef}>
        <button
          type="button"
          className="auth-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 pr-8">
          <h2
            id="login-required-title"
            className="font-dialogue text-xl font-semibold text-[var(--color-carbon-ink)]"
          >
            Sign in to continue
          </h2>
          <p className="mt-1 text-sm text-[var(--color-fossil-gray)]">
            You&apos;ve used your 3 free analyses. Create a free account to keep going.
          </p>
        </div>

        <EmailAuthForm mode="sign-in" compact onSuccess={onClose} />
      </div>
    </div>
  );
}

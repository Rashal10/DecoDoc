import { useId, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { AlertCircle, ArrowUp, Eye, EyeOff } from "lucide-react";
import { passwordStrength } from "../../lib/password-strength";
import { cn } from "../../lib/utils";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  error?: string;
  /** Right side of the label row, e.g. a "Forgot password?" link. */
  labelAside?: ReactNode;
  children?: ReactNode;
};

export function AuthTextField({ label, error, labelAside, className, children, ...input }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={cn("auth2-field", className)}>
      <div className="auth2-label-row">
        <label htmlFor={id} className="auth2-label">
          {label}
        </label>
        {labelAside}
      </div>
      <input
        id={id}
        className="auth2-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...input}
      />
      {children}
      {error ? (
        <p id={errorId} className="auth2-field-error">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

type PasswordFieldProps = Omit<FieldProps, "type"> & {
  showStrength?: boolean;
};

export function AuthPasswordField({
  label,
  error,
  labelAside,
  className,
  showStrength = false,
  onKeyDown,
  onKeyUp,
  onChange,
  ...input
}: PasswordFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const capsId = `${id}-caps`;
  const strengthId = `${id}-strength`;
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [value, setValue] = useState("");
  const strength = passwordStrength(value);

  const trackCaps = (event: KeyboardEvent<HTMLInputElement>) => {
    if (typeof event.getModifierState === "function") setCapsLock(event.getModifierState("CapsLock"));
  };

  const describedBy = [error ? errorId : "", capsLock ? capsId : "", showStrength && value ? strengthId : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("auth2-field", className)}>
      <div className="auth2-label-row">
        <label htmlFor={id} className="auth2-label">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="auth2-password-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className="auth2-input pr-12"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          onKeyDown={(event) => {
            trackCaps(event);
            onKeyDown?.(event);
          }}
          onKeyUp={(event) => {
            trackCaps(event);
            onKeyUp?.(event);
          }}
          onChange={(event) => {
            setValue(event.target.value);
            onChange?.(event);
          }}
          {...input}
        />
        <button
          type="button"
          className="auth2-eye"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>

      {capsLock ? (
        <p id={capsId} className="auth2-caps" role="status">
          <ArrowUp className="h-3.5 w-3.5" aria-hidden />
          Caps Lock is on
        </p>
      ) : null}

      {showStrength && value ? (
        <div id={strengthId} className="auth2-strength" data-score={strength.score} aria-live="polite">
          <div className="auth2-strength-bars" aria-hidden>
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={n <= strength.score ? "is-on" : undefined} />
            ))}
          </div>
          <p>
            <span className="auth2-strength-label">{strength.label}</span>
            {strength.hint ? <span className="auth2-strength-hint"> · {strength.hint}</span> : null}
          </p>
        </div>
      ) : null}

      {error ? (
        <p id={errorId} className="auth2-field-error">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export function GoogleButton({ onClick, label = "Continue with Google" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="auth2-google">
      <GoogleIcon />
      {label}
    </button>
  );
}

export function AuthDivider({ children }: { children: ReactNode }) {
  return (
    <div className="auth2-divider" role="separator">
      <span>{children}</span>
    </div>
  );
}

export function AuthAlert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("auth2-alert", `auth2-alert--${tone}`)}>
      {children}
    </div>
  );
}

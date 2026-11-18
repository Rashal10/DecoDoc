import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthAlert, AuthPasswordField } from "../components/auth/AuthFields";
import { useAuth } from "../lib/auth-context";
import { FORGOT_PASSWORD_PATH, navigateHome, navigateTo } from "../lib/auth-nav";
import { MIN_PASSWORD_LENGTH } from "../lib/password-strength";

function readTokenFromUrl(): string {
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

export function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [token] = useState(readTokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Keep the token out of the address bar and browser history once it's been read.
  useEffect(() => {
    if (window.location.search) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const passwordError =
    touched.password && password.length < MIN_PASSWORD_LENGTH
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
      : "";
  const confirmError = touched.confirm && confirm !== password ? "Passwords don't match." : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setTouched({ password: true, confirm: true });
    if (password.length < MIN_PASSWORD_LENGTH || password !== confirm) return;

    setBusy(true);
    try {
      await resetPassword(token, password);
      navigateHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  const requestNew = (
    <button type="button" className="auth2-link" onClick={() => navigateTo(FORGOT_PASSWORD_PATH)}>
      Request a new link
    </button>
  );

  if (!token) {
    return (
      <AuthLayout
        eyebrow="Reset password"
        title={
          <>
            This link is <em>incomplete.</em>
          </>
        }
        subtitle="Open the link from your email again, or ask for a new one."
        footer={requestNew}
      >
        <AuthAlert>The reset link is missing its token.</AuthAlert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Reset password"
      title={
        <>
          Choose a new <em>password.</em>
        </>
      }
      subtitle="You'll be signed in as soon as it's saved."
      footer={<>Link expired? {requestNew}</>}
    >
      {error ? <AuthAlert>{error}</AuthAlert> : null}
      <form className="auth2-form" onSubmit={handleSubmit} noValidate>
        <AuthPasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={passwordError}
          showStrength
          required
          autoFocus
        />
        <AuthPasswordField
          label="Confirm new password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Type it again"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          error={confirmError}
          required
        />
        <button type="submit" disabled={busy} className="auth2-submit">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            "Save password and sign in"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

import { useState, type FormEvent } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthAlert, AuthTextField } from "../components/auth/AuthFields";
import { useAuth } from "../lib/auth-context";
import { navigateTo, SIGN_IN_PATH } from "../lib/auth-nav";
import { validateEmail } from "../lib/password-strength";

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  const emailError = touched ? validateEmail(email) : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setTouched(true);
    if (validateEmail(email)) return;

    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSentTo(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset link.");
    } finally {
      setBusy(false);
    }
  }

  const backToSignIn = (
    <>
      Remembered it?{" "}
      <button type="button" className="auth2-link" onClick={() => navigateTo(SIGN_IN_PATH)}>
        Back to sign in
      </button>
    </>
  );

  if (sentTo) {
    return (
      <AuthLayout
        eyebrow="Check your inbox"
        title={
          <>
            Link <em>sent.</em>
          </>
        }
        footer={backToSignIn}
      >
        <div className="auth2-success">
          <MailCheck className="h-6 w-6" aria-hidden />
          <p>
            If an account exists for <strong>{sentTo}</strong>, we've emailed a link to reset the password. It
            works for 30 minutes.
          </p>
        </div>
        <button type="button" className="auth2-secondary" onClick={() => setSentTo("")}>
          Use a different email
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Reset password"
      title={
        <>
          Forgot your <em>password?</em>
        </>
      }
      subtitle="Enter the email you signed up with and we'll send you a link to choose a new one."
      footer={backToSignIn}
    >
      {error ? <AuthAlert>{error}</AuthAlert> : null}
      <form className="auth2-form" onSubmit={handleSubmit} noValidate>
        <AuthTextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          error={emailError}
          required
          autoFocus
        />
        <button type="submit" disabled={busy} className="auth2-submit">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Sending link…
            </>
          ) : (
            "Send reset link"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

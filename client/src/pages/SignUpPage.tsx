import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthAlert, AuthDivider, AuthPasswordField, AuthTextField, GoogleButton } from "../components/auth/AuthFields";
import { useAuth } from "../lib/auth-context";
import { apiUrl } from "../lib/api-base";
import { navigateHome, navigateTo, SIGN_IN_PATH } from "../lib/auth-nav";
import { MIN_PASSWORD_LENGTH, validateEmail } from "../lib/password-strength";

type Touched = { email: boolean; password: boolean; confirm: boolean };

export function SignUpPage() {
  const { register, isSignedIn, googleEnabled } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState<Touched>({ email: false, password: false, confirm: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isSignedIn) navigateHome();
  }, [isSignedIn]);

  const emailError = touched.email ? validateEmail(email) : "";
  const passwordError =
    touched.password && password.length < MIN_PASSWORD_LENGTH
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
      : "";
  const confirmError = touched.confirm && confirm !== password ? "Passwords don't match." : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setTouched({ email: true, password: true, confirm: true });
    if (validateEmail(email) || password.length < MIN_PASSWORD_LENGTH || password !== confirm) return;

    setBusy(true);
    try {
      await register(email.trim(), password, displayName.trim() || undefined);
      navigateHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setBusy(false);
    }
  }

  if (isSignedIn) return null;

  return (
    <AuthLayout
      eyebrow="Create account"
      title={
        <>
          Start reading <em>smarter.</em>
        </>
      }
      subtitle="Free forever for 10 analyses a day. Your library syncs to every device you sign in on."
      footer={
        <>
          Already have an account?{" "}
          <button type="button" className="auth2-link" onClick={() => navigateTo(SIGN_IN_PATH)}>
            Sign in
          </button>
        </>
      }
    >
      {error ? <AuthAlert>{error}</AuthAlert> : null}

      {googleEnabled ? (
        <>
          <GoogleButton
            label="Sign up with Google"
            onClick={() => (window.location.href = apiUrl("/api/auth/google"))}
          />
          <AuthDivider>or sign up with email</AuthDivider>
        </>
      ) : null}

      <form className="auth2-form" onSubmit={handleSubmit} noValidate>
        <AuthTextField
          label="Name"
          name="displayName"
          type="text"
          autoComplete="name"
          placeholder="Ada Lovelace (optional)"
          maxLength={80}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <AuthTextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={emailError}
          required
        />

        <AuthPasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={passwordError}
          showStrength
          required
        />

        <AuthPasswordField
          label="Confirm password"
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
              Creating account…
            </>
          ) : (
            "Create free account"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

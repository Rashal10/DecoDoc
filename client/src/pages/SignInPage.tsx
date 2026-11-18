import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthAlert, AuthDivider, AuthPasswordField, AuthTextField, GoogleButton } from "../components/auth/AuthFields";
import { useAuth } from "../lib/auth-context";
import { apiUrl } from "../lib/api-base";
import { FORGOT_PASSWORD_PATH, navigateHome, navigateTo, SIGN_UP_PATH } from "../lib/auth-nav";
import { validateEmail } from "../lib/password-strength";

export function SignInPage() {
  const { login, isSignedIn, googleEnabled } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isSignedIn) navigateHome();
  }, [isSignedIn]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setError(err);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const emailError = touched.email ? validateEmail(email) : "";
  const passwordError = touched.password && !password ? "Enter your password." : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setTouched({ email: true, password: true });
    if (validateEmail(email) || !password) return;

    setBusy(true);
    try {
      await login(email.trim(), password);
      navigateHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  if (isSignedIn) return null;

  return (
    <AuthLayout
      eyebrow="Sign in"
      title={
        <>
          Welcome <em>back.</em>
        </>
      }
      subtitle="Pick up where you left off: your library, flashcards and reviews are waiting."
      footer={
        <>
          New to DecoDoc?{" "}
          <button type="button" className="auth2-link" onClick={() => navigateTo(SIGN_UP_PATH)}>
            Create a free account
          </button>
        </>
      }
    >
      {error ? <AuthAlert>{error}</AuthAlert> : null}

      {googleEnabled ? (
        <>
          <GoogleButton onClick={() => (window.location.href = apiUrl("/api/auth/google"))} />
          <AuthDivider>or sign in with email</AuthDivider>
        </>
      ) : null}

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
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={emailError}
          required
        />

        <AuthPasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={passwordError}
          required
          labelAside={
            <button type="button" className="auth2-link auth2-link--small" onClick={() => navigateTo(FORGOT_PASSWORD_PATH)}>
              Forgot password?
            </button>
          }
        />

        <button type="submit" disabled={busy} className="auth2-submit">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

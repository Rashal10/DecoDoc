import { useEffect, useState, type FormEvent } from "react";
import { SignInPage as AuthScreen } from "../components/ui/sign-in";
import { useAuth } from "../lib/auth-context";
import { apiUrl } from "../lib/api-base";
import { navigateHome, navigateTo, SIGN_UP_PATH } from "../lib/auth-nav";

export function SignInPage() {
  const { login, isSignedIn, googleEnabled } = useAuth();
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setBusy(true);
    try {
      await login(email, password);
      navigateHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  if (isSignedIn) return null;

  return (
    <AuthScreen
      mode="sign-in"
      heroImageSrc="/images/auth-hero-nebula.png"
      googleEnabled={googleEnabled}
      busy={busy}
      error={error}
      onSubmit={handleSubmit}
      onGoogleSignIn={() => {
        window.location.href = apiUrl("/api/auth/google");
      }}
      onSwitchMode={() => navigateTo(SIGN_UP_PATH)}
    />
  );
}

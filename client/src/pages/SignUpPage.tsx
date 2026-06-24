import { useEffect, useState, type FormEvent } from "react";
import { SignInPage as AuthScreen } from "../components/ui/sign-in";
import { useAuth } from "../lib/auth-context";
import { apiUrl } from "../lib/api-base";
import { navigateHome, navigateTo, SIGN_IN_PATH } from "../lib/auth-nav";

export function SignUpPage() {
  const { register, isSignedIn, googleEnabled } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isSignedIn) navigateHome();
  }, [isSignedIn]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const displayName = String(form.get("displayName") ?? "").trim();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await register(email, password, displayName || undefined);
      navigateHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setBusy(false);
    }
  }

  if (isSignedIn) return null;

  return (
    <AuthScreen
      mode="sign-up"
      heroImageSrc="/images/auth-hero-nebula.png"
      googleEnabled={googleEnabled}
      busy={busy}
      error={error}
      onSubmit={handleSubmit}
      onGoogleSignIn={() => {
        window.location.href = apiUrl("/api/auth/google");
      }}
      onSwitchMode={() => navigateTo(SIGN_IN_PATH)}
    />
  );
}

import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { AuthProvider } from "./lib/auth-context";
import {
  FORGOT_PASSWORD_PATH,
  RESET_PASSWORD_PATH,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  usePathname,
} from "./lib/auth-nav";
import "./styles.css";

function AppRouter() {
  const pathname = usePathname();

  if (pathname === SIGN_IN_PATH) return <SignInPage />;
  if (pathname === SIGN_UP_PATH) return <SignUpPage />;
  if (pathname === FORGOT_PASSWORD_PATH) return <ForgotPasswordPage />;
  if (pathname === RESET_PASSWORD_PATH) return <ResetPasswordPage />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>
);

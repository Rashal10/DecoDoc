import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";
import { AuthProvider } from "./lib/auth-context";
import { SIGN_IN_PATH, SIGN_UP_PATH, usePathname } from "./lib/auth-nav";
import "./styles.css";

function AppRouter() {
  const pathname = usePathname();

  if (pathname === SIGN_IN_PATH) return <SignInPage />;
  if (pathname === SIGN_UP_PATH) return <SignUpPage />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>
);

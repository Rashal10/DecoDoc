import React, { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { DecoDocLogo } from "./decodoc-logo";
import { navigateHome } from "../../lib/auth-nav";
import { cn } from "../../lib/utils";

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z"
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
      d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z"
    />
  </svg>
);

export type Testimonial = {
  avatarSrc?: string;
  initials?: string;
  name: string;
  handle: string;
  text: string;
};

export type AuthScreenMode = "sign-in" | "sign-up";

export type SignInPageProps = {
  mode?: AuthScreenMode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  googleEnabled?: boolean;
  busy?: boolean;
  error?: string;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onGoogleSignIn?: () => void;
  onSwitchMode?: () => void;
};

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-blush-paper)]/80 backdrop-blur-sm transition-colors focus-within:border-[var(--color-pumpkin-orange)]/60 focus-within:bg-white">
    {children}
  </div>
);

function TestimonialCard({ testimonial, delay }: { testimonial: Testimonial; delay: string }) {
  return (
    <div
      className={cn(
        "animate-testimonial flex w-64 items-start gap-3 rounded-3xl border border-white/15 bg-black/35 p-5 backdrop-blur-xl",
        delay
      )}
    >
      {testimonial.avatarSrc ? (
        <img
          src={testimonial.avatarSrc}
          className="h-10 w-10 shrink-0 rounded-2xl object-cover"
          alt=""
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-pumpkin-orange)]/90 text-xs font-bold text-white">
          {testimonial.initials ?? testimonial.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="text-sm leading-snug text-white">
        <p className="font-medium">{testimonial.name}</p>
        <p className="text-white/65">{testimonial.handle}</p>
        <p className="mt-1 text-white/85">{testimonial.text}</p>
      </div>
    </div>
  );
}

export const SignInPage: React.FC<SignInPageProps> = ({
  mode = "sign-in",
  title,
  description,
  heroImageSrc = "/images/auth-hero-nebula.png",
  testimonials = [],
  googleEnabled = false,
  busy = false,
  error,
  onSubmit,
  onGoogleSignIn,
  onSwitchMode,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isSignUp = mode === "sign-up";

  const heading =
    title ??
    (isSignUp ? (
      <span className="font-dialogue italic tracking-tight text-[var(--color-carbon-ink)]">
        Create your account
      </span>
    ) : (
      <span className="font-dialogue italic tracking-tight text-[var(--color-carbon-ink)]">
        Welcome back
      </span>
    ));

  const subheading =
    description ??
    (isSignUp
      ? "Sign up for free to analyze papers."
      : "Sign in to continue analyzing research papers.");

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--color-blush-paper)] font-sans md:flex-row">
      <section className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <button
            type="button"
            onClick={() => navigateHome()}
            className="border-0 bg-transparent p-0 cursor-pointer"
            aria-label="DecoDoc home"
          >
            <DecoDocLogo />
          </button>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-10 md:px-10">
          <div className="w-full max-w-md">
            <div className="flex flex-col gap-6">
              <h1 className="animate-element animate-delay-100 text-4xl font-semibold leading-tight md:text-[2.75rem]">
                {heading}
              </h1>
              <p className="animate-element animate-delay-200 text-[var(--color-fossil-gray)]">
                {subheading}
              </p>

              {error && (
                <div
                  role="alert"
                  className="animate-element animate-delay-200 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {error}
                </div>
              )}

              <form className="space-y-5" onSubmit={onSubmit} noValidate>
                {isSignUp && (
                  <div className="animate-element animate-delay-250">
                    <label className="text-sm font-medium text-[var(--color-fossil-gray)]">Name</label>
                    <GlassInputWrapper>
                      <input
                        name="displayName"
                        type="text"
                        autoComplete="name"
                        className="w-full rounded-2xl bg-transparent p-4 text-sm focus:outline-none"
                      />
                    </GlassInputWrapper>
                  </div>
                )}

                <div className="animate-element animate-delay-300">
                  <label className="text-sm font-medium text-[var(--color-fossil-gray)]">Email</label>
                  <GlassInputWrapper>
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      className="w-full rounded-2xl bg-transparent p-4 text-sm focus:outline-none"
                      required
                    />
                  </GlassInputWrapper>
                </div>

                <div className="animate-element animate-delay-400">
                  <label className="text-sm font-medium text-[var(--color-fossil-gray)]">Password</label>
                  <GlassInputWrapper>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                        className="w-full rounded-2xl bg-transparent p-4 pr-12 text-sm focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center border-0 bg-transparent cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-[var(--color-fossil-gray)]" />
                        ) : (
                          <Eye className="h-5 w-5 text-[var(--color-fossil-gray)]" />
                        )}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>

                {isSignUp && (
                  <div className="animate-element animate-delay-450">
                    <label className="text-sm font-medium text-[var(--color-fossil-gray)]">
                      Confirm password
                    </label>
                    <GlassInputWrapper>
                      <input
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="w-full rounded-2xl bg-transparent p-4 text-sm focus:outline-none"
                        required
                      />
                    </GlassInputWrapper>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="animate-element animate-delay-600 btn-primary w-full !rounded-2xl py-4"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      {isSignUp ? "Creating account…" : "Signing in…"}
                    </>
                  ) : isSignUp ? (
                    "Create account"
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              {googleEnabled && (
                <>
                  <div className="animate-element animate-delay-700 relative flex items-center justify-center">
                    <span className="w-full border-t border-[var(--color-border)]" />
                    <span className="absolute bg-[var(--color-blush-paper)] px-4 text-sm text-[var(--color-fossil-gray)]">
                      Or continue with
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    className="animate-element animate-delay-800 flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white py-4 transition-colors hover:bg-[var(--color-blush-paper)]"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>
                </>
              )}

              <p className="animate-element animate-delay-900 text-center text-sm text-[var(--color-fossil-gray)]">
                {isSignUp ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={onSwitchMode}
                      className="auth-link font-semibold text-[var(--color-pumpkin-orange)]"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    New to DecoDoc?{" "}
                    <button
                      type="button"
                      onClick={onSwitchMode}
                      className="auth-link font-semibold text-[var(--color-pumpkin-orange)]"
                    >
                      Create a free account
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {heroImageSrc && (
        <section className="relative hidden min-h-0 flex-1 p-4 md:block">
          <div
            className="animate-slide-right animate-delay-300 absolute inset-4 overflow-hidden rounded-3xl bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
            role="img"
            aria-label="Cosmic nebula"
          />
          <div className="absolute inset-4 rounded-3xl bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />
          {testimonials.length > 0 && (
            <div className="absolute bottom-8 left-1/2 flex w-full -translate-x-1/2 justify-center gap-4 px-6">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && (
                <div className="hidden xl:flex">
                  <TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" />
                </div>
              )}
              {testimonials[2] && (
                <div className="hidden 2xl:flex">
                  <TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

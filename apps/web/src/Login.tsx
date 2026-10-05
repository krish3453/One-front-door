import React, { useState } from "react";
import { loginWithGoogle, loginDemo, type AuthUser } from "./services/api";
import "./App.css";

interface LoginProps {
  onLoginSuccess: (user: AuthUser) => void;
  authError?: string | null;
  onClearError?: () => void;
}

export const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  authError,
  onClearError,
}) => {
  const [loadingAction, setLoadingAction] = useState<"google" | "demo" | null>(
    null
  );
  const [internalError, setInternalError] = useState<string | null>(null);

  const displayError = authError || internalError;

  const handleGoogleLogin = () => {
    setLoadingAction("google");
    setInternalError(null);
    if (onClearError) onClearError();
    loginWithGoogle();
  };

  const handleDemoLogin = async () => {
    try {
      setLoadingAction("demo");
      setInternalError(null);
      if (onClearError) onClearError();
      const res = await loginDemo();
      if (res.authenticated && res.user) {
        onLoginSuccess(res.user);
      } else {
        setInternalError("Failed to sign in as demo student. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Demo login error:", err);
      const msg =
        err instanceof Error ? err.message : "Unable to complete demo login.";
      setInternalError(msg);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="login-page">
      {/* Dynamic background ambient glows */}
      <div className="login-bg-glow glow-1" />
      <div className="login-bg-glow glow-2" />

      <div className="login-card">
        {/* University Brand Header */}
        <div className="login-badge-container">
          <div className="login-logo">
            <svg
              className="login-logo-svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <span className="login-portal-tag">One Front Door</span>
        </div>

        <h1 className="login-title">Welcome to Campus AI</h1>
        <p className="login-subtitle">
          Your unified university intelligence portal for academics, services,
          schedules, and campus life.
        </p>

        {/* Feature Pills */}
        <div className="login-features">
          <div className="feature-pill">
            <span className="feature-icon">📚</span>
            <span>Academic Syllabi & Electives</span>
          </div>
          <div className="feature-pill">
            <span className="feature-icon">🏛️</span>
            <span>Locations, Dining & Hours</span>
          </div>
          <div className="feature-pill">
            <span className="feature-icon">⚡</span>
            <span>Multi-Agent AI Intelligence</span>
          </div>
        </div>

        {/* Error notification if any */}
        {displayError && (
          <div className="login-error-banner" role="alert">
            <svg
              className="error-icon"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="error-text">
              <strong>Authentication notice:</strong>
              <span>
                {displayError === "google_auth_failed"
                  ? "Google authentication was cancelled or could not be completed."
                  : displayError}
              </span>
            </div>
            {onClearError && (
              <button
                className="error-dismiss"
                onClick={() => {
                  setInternalError(null);
                  onClearError();
                }}
                title="Dismiss"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="login-actions">
          <button
            id="google-login-btn"
            className="google-login-button"
            onClick={handleGoogleLogin}
            disabled={loadingAction !== null}
          >
            {loadingAction === "google" ? (
              <span className="button-spinner" />
            ) : (
              <svg className="google-icon-svg" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>
              {loadingAction === "google"
                ? "Connecting to Google..."
                : "Continue with Google Account"}
            </span>
          </button>

          <div className="login-divider">
            <span>or explore right now</span>
          </div>

          <button
            id="demo-login-btn"
            className="demo-login-button"
            onClick={handleDemoLogin}
            disabled={loadingAction !== null}
          >
            {loadingAction === "demo" ? (
              <span className="button-spinner" />
            ) : (
              <span className="demo-icon">⚡</span>
            )}
            <span>
              {loadingAction === "demo"
                ? "Accessing Portal..."
                : "Instant Student Access (Demo)"}
            </span>
          </button>
        </div>

        {/* Security Reassurance Footer */}
        <div className="login-footer">
          <svg
            className="lock-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>
            Authorized access only. Session protected with secure university
            authentication.
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
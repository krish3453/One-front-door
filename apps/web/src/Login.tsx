import React, { useState } from "react";
import { loginWithGoogle, loginDemo, type AuthUser } from "./services/api";
import GhostFibers from "./components/GhostFibers/GhostFibers";
import HomePage from "./components/HomePage/HomePage";
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
  const scrollRef = React.useRef<HTMLDivElement>(null);

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

  // If a user clicks a suggestion on the landing page, auto-login using the demo account
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSuggestionClick = async (_suggestion: string) => {
    // We can just trigger demo login. In a real app we might pass the suggestion via URL or state
    // so it executes immediately after login. For now, just logging in is a great interaction.
    await handleDemoLogin();
  };

  return (
    <div className="login-page">
      {/* GhostFibers animated WebGL background */}
      <div className="login-fibers-bg">
        <GhostFibers
          lineColor="#0c0e14"
          glowColor="#fde047"
          speed={0.2}
          scale={2}
          rotation={0}
          rotationSpeed={0.25}
          layers={4}
          waveAmplitude={0.015}
          waveFrequency={3}
          waveSpeed={0.15}
          layerSpeed={0.08}
          twist={0.1}
          twistFrequency={5}
          twistSpeed={1.2}
          lineFrequency={5}
          lineSpacing={2}
          lineSharpness={16}
          glowFalloff={10}
          glowIntensity={0.9}
          brightness={1.2}
          blueBoost={0.3}
          vignette={0.8}
          grain={0.05}
          dpr={1}
        />
      </div>

      {/* Top Navigation Bar with Login Actions */}
      <div className="landing-top-bar">
        <div className="landing-brand">
          {/* The Interactive Orb will move here dynamically on scroll */}
        </div>
        
        <div className="landing-auth-actions">
          {displayError && (
            <div className="login-error-tooltip">
              {displayError === "google_auth_failed"
                ? "Google auth failed."
                : displayError}
            </div>
          )}
          
          <button
            className="btn-demo-login-sm"
            onClick={handleDemoLogin}
            disabled={loadingAction !== null}
          >
            {loadingAction === "demo" ? (
              <span className="btn-spinner-sm" />
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            )}
            <span>Try Demo</span>
          </button>

          <button
            className="btn-google-login-sm"
            onClick={handleGoogleLogin}
            disabled={loadingAction !== null}
          >
            {loadingAction === "google" ? (
              <span className="btn-spinner-sm" />
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            )}
            <span>Sign In</span>
          </button>
        </div>
      </div>

      {/* Landing Page Content (Scrollable) */}
      <div className="landing-scroll-container" ref={scrollRef}>
        <HomePage onSuggestion={handleSuggestionClick} scrollContainerRef={scrollRef} />
      </div>
    </div>
  );
};

export default Login;
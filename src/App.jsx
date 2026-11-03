import { useEffect, useState } from "react";
import ClosetApp from "./Closet.jsx";

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="Borrowed home">
      <span className="brand-mark" aria-hidden="true">b.</span>
      <span>borrowed</span>
    </a>
  );
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { user } = await request(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onAuthenticated(user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  return (
    <main className="auth-layout">
      <section className="intro-panel" aria-labelledby="intro-title">
        <Brand />
        <div className="intro-copy">
          <p className="eyebrow">A little more room to get dressed</p>
          <h1 id="intro-title">Love what you own.</h1>
          <p className="intro-description">
            Your closet, all in one place. Start with the pieces that already
            make you feel like you.
          </p>
        </div>
        <div className="closet-art" aria-hidden="true">
          <span className="sparkle sparkle-one">✳</span>
          <svg className="hanger-illustration" viewBox="0 0 200 130" fill="none">
            <path
              d="M101 27c0-10 6-16 14-16 7 0 12 5 12 11 0 10-13 11-13 22M100 54 28 102c-5 4-2 12 5 12h134c7 0 10-8 5-12L100 54Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="5"
            />
          </svg>
          <span className="closet-art-caption">good outfits, on repeat</span>
          <span className="sparkle sparkle-two">✳</span>
        </div>
        <p className="intro-footer">A closet tracker for real life.</p>
      </section>

      <section className="form-panel" aria-labelledby="form-title">
        <div className="form-card">
          <Brand />
          <p className="eyebrow form-eyebrow">
            {mode === "signup" ? "Your closet starts here" : "Welcome back"}
          </p>
          <h2 id="form-title">
            {mode === "signup" ? "Make yourself at home." : "Good to see you."}
          </h2>
          <p className="form-description">
            {mode === "signup"
              ? "Create an account to keep your closet yours."
              : "Log in to pick up where you left off."}
          </p>

          <div className="mode-switch" role="tablist" aria-label="Account action">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={mode === "signup" ? "mode-tab active" : "mode-tab"}
              onClick={() => changeMode("signup")}
            >
              Sign up
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "mode-tab active" : "mode-tab"}
              onClick={() => changeMode("login")}
            >
              Log in
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />

            <div className="password-label-row">
              <label htmlFor="password">Password</label>
              {mode === "signup" && <span>At least 8 characters</span>}
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={72}
              required
            />

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button className="submit-button" type="submit" disabled={busy}>
              {busy
                ? "One moment…"
                : mode === "signup"
                  ? "Create my account"
                  : "Log in"}
              {!busy && <span aria-hidden="true">↗</span>}
            </button>
          </form>

          <p className="privacy-note">
            Your closet is private to you. No email verification needed.
          </p>
        </div>
        <p className="copyright">Made for the pieces you already love.</p>
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    request("/api/auth/me")
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (checkingSession) {
    return (
      <main className="loading-screen" aria-live="polite">
        <span className="loading-mark">b.</span>
        <p>Opening your closet…</p>
      </main>
    );
  }

  return user ? (
    <ClosetApp user={user} onLogout={() => setUser(null)} />
  ) : (
    <AuthScreen onAuthenticated={setUser} />
  );
}

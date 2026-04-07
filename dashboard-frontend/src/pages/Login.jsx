import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", response.data.token);
      if (response.data.role) localStorage.setItem("role", response.data.role);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-ambient auth-ambient-left" />
      <div className="auth-ambient auth-ambient-right" />

      <section className="auth-shell">
        <div className="auth-showcase">
          <span className="eyebrow">Operational Awareness</span>
          <h1>See the health of your infrastructure before issues spread.</h1>
          <p>
            SentryNet brings devices, alerts, and status telemetry into one interface
            that feels crisp, modern, and built for fast decisions.
          </p>

          <div className="auth-feature-list">
            <div>
              <strong>Live fleet visibility</strong>
              <span>Know what is online, offline, or drifting in real time.</span>
            </div>
            <div>
              <strong>Alert-first workflow</strong>
              <span>Surface operational risk without hunting across screens.</span>
            </div>
            <div>
              <strong>Polished control center</strong>
              <span>Designed to feel focused on both desktop and smaller screens.</span>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <span className="eyebrow">Welcome Back</span>
            <h2>Log in to continue</h2>
            <p>Access your infrastructure dashboard and current monitoring overview.</p>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ops@sentrynet.local"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
            </label>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="auth-switch">
            Don&apos;t have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default Login;

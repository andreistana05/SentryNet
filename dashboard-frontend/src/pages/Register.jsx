import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await API.post("/auth/register", form);
      localStorage.setItem("token", response.data.token);
      if (response.data.user?.role) localStorage.setItem("role", response.data.user.role);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
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
          <span className="eyebrow">Launch Secure Monitoring</span>
          <h1>Bring your team into a dashboard that feels purpose-built for operations.</h1>
          <p>
            Create an account to start organizing your infrastructure telemetry, monitor
            availability, and review alerts from one place.
          </p>

          <div className="auth-feature-list">
            <div>
              <strong>Focused operator UI</strong>
              <span>Large visual signals, sharp contrast, and responsive panels.</span>
            </div>
            <div>
              <strong>Immediate onboarding</strong>
              <span>Register and move straight into the live dashboard experience.</span>
            </div>
            <div>
              <strong>Built to scale</strong>
              <span>Works well as your monitored device inventory grows.</span>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <span className="eyebrow">Create Account</span>
            <h2>Get started with SentryNet</h2>
            <p>Set up your profile and step into the monitoring workspace.</p>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <form className="auth-form" onSubmit={handleRegister}>
            <label>
              <span>Username</span>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Network operator"
                required
              />
            </label>

            <label>
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="ops@sentrynet.local"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Create a secure password"
                required
              />
            </label>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Register"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/">Log in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default Register;

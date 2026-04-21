import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { getMutationErrorMessage, useRegisterMutation } from "../hooks/useDashboardData";

function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      await registerMutation.mutateAsync(form);
      navigate("/dashboard");
    } catch (mutationError) {
      setError(getMutationErrorMessage(mutationError, "Registration failed"));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-ambient auth-ambient-left" />
      <div className="auth-ambient auth-ambient-right" />

      <section className="auth-shell">
        <div className="auth-topbar">
          <div className="auth-brand">
            <div className="brand-mark">SN</div>
            <div>
              <span className="eyebrow">Mission Control</span>
              <strong>SentryNet</strong>
            </div>
          </div>

          <ThemeToggle />
        </div>

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

            <button type="submit" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Creating account..." : "Register"}
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

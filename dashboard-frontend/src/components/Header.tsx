import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { clearStoredAuth, getStoredUsername } from "../lib/storage";

function Header() {
  const navigate = useNavigate();
  const username = getStoredUsername();

  const dateLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date());
  }, []);

  const timeLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
  }, []);

  const handleLogout = () => {
    clearStoredAuth();
    navigate("/");
  };

  return (
    <header className="header">
      <div>
        <span className="eyebrow">SentryNet Console</span>
        <h1>Infrastructure Dashboard</h1>
      </div>

      <div className="header-actions">
        <div className="header-presence">
          <span>{dateLabel}</span>
          <strong>{timeLabel}</strong>
        </div>

        <div className="role-pill">{username}</div>

        <button className="logout-btn" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;

import { useState, type FormEvent } from "react";
import AppShell from "../components/AppShell";
import { useDashboardOverview, useDevices } from "../hooks/useDashboardData";
import { buildDashboardStats } from "../lib/dashboard";
import { getStoredEmail, getStoredRole, getStoredUsername } from "../lib/storage";

const EMPTY_DEVICES: never[] = [];
const ROLE_OPTIONS = ["Admin", "Operator", "Viewer"];

// Replace with GET /api/v1/users when backend endpoint is ready
const MOCK_SYSTEM_USERS = [
  { id: "1", username: "admin",    email: "admin@sentrynet.io",    role: "Admin" },
  { id: "2", username: "operator", email: "operator@sentrynet.io", role: "Operator" },
  { id: "3", username: "viewer",   email: "viewer@sentrynet.io",   role: "Viewer" },
];

function avatarColor(name: string): string {
    const colors = ["#a78bfa", "#67e8f9", "#4ade80", "#fb923c", "#e879f9", "#fbbf24"];
    let hash = 0;
    for(let i = 0 ; i < name.length; i++)
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) & colors.length];
}

function roleBadgeClass(role: string) {
    const r = role.toLowerCase();
    if (r === "admin") return "role-badge role-badge-admin";
    if (r === "operator") return "role-badge role-badge-operator";
    return "role-badge role-badge-viewer";
}

function ConfirmIdentityModal({onConfirm, onClose}: {onConfirm: () => void; onClose: () => void}) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if(!password.trim()) {
            setError("Please enter your password.");
            return;
        }
        // TODO: replace with POST /api/v1/auth/me/verify-password
        onConfirm();
        onClose();
    }
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <span className="eyebrow">Security</span>
                <h3>Confirm your identity</h3>
                <p className="modal-subtitle">Enter your current password to access security settings.</p>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="modal-field">
                        <label htmlFor="confirm-password">Current password</label>
                        <input id="confirm-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoFocus />
                    </div>
                    {error && <p className="modal-error">{error}</p>}
                    <div className="modal-actions">
                        <button type="button" className="ghost-action" onClick={onClose}>Cancel</button>
                        <button type="submit" className="table-action-link">Confirm</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ProfilePage() {
    const overviewQuery = useDashboardOverview();
    const devicesQuery = useDevices();
    const devices = devicesQuery.data ?? EMPTY_DEVICES;
    const username = getStoredUsername();
    const email = getStoredEmail();
    const role = getStoredRole();
    const isAdmin = role.toLowerCase() === "admin";

    const [showConfirm, setShowConfirm] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [pwSuccess, setPwSuccess] = useState(false);
    const [pwError, setPwError] = useState("");

    //Replace with API data from GET /api/v1/users when backend is ready
    const [systemUsers, setSystemUsers] = useState(MOCK_SYSTEM_USERS);
    const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});

    const stats = buildDashboardStats({overview: overviewQuery.data, devices});
    
    function handlePasswordSubmit(e: FormEvent) {
        e.preventDefault();
        setPwError("");
        if(newPassword.length < 8) {setPwError("Password must be at least 8 characters long."); return;}
        if(newPassword != confirmPw ) {setPwError("Passwords don't match."); return;}
        //TODO: call PUT /api/v1/auth/me with {password: newPassword}
        setPwSuccess(true);
        setNewPassword("");
        setConfirmPw("");
    }

    function handleRoleSave(userId: string) {
        const newRole = pendingRoles[userId];
        if(!newRole) return;
        //TODO: call PATCH /api/v1/users/:id/role with {role: newRole}
        setSystemUsers((prev) => prev.map((u) => (u.id === userId ? {...u, role: newRole}: u)))
        setPendingRoles((prev) => { const next = {...prev}; delete next[userId]; return next;})
    }

    const displayRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase(); 

    return (
        <AppShell stats={stats} headerSlot={<span className="eyebrow">My Profile</span>}>
            <section className="page-summary">
                <div className="summary-metrics">
                    <div className="summary-metric">
                        <span>Logged In</span>
                        <strong>{username}</strong>
                    </div>
                    <div className="summary-metric">
                        <span>Role</span>
                        <strong>{displayRole}</strong>
                    </div>
                    <div className="summary-metric summary-metric-wide">
                        <span>Access</span>
                        <strong>
                            {isAdmin
                                ? "Admin - full system access"
                                : role.toLowerCase() === "operator"
                                ? "Operator - monitoring & response"
                                : "Viewer - read only"
                            }
                        </strong>
                    </div>
                </div>
            </section>

            <div className="profile-body">
                {/* Profile card */}
                <section className="table-container profile-card-section">
                    <div className="profile-card-body">
                        <div className="profile-avatar" style={{background: avatarColor(username) }}>
                            {username.slice(0, 2).toUpperCase()}
                        </div>
                        <h2 className="profile-name">{username}</h2>
                        {email && <p className="profile-email">{email}</p>}
                        <span className={roleBadgeClass(role)} style={{marginTop: "0.5rem"}}>{displayRole}</span>
                        <div className="profile-meta">
                            <div className="profile-meta-row">
                                <span>Username</span>
                                <span>{username}</span>
                            </div>
                            <div className="profile-meta-row">
                                <span>Role</span>
                                <span>{displayRole}</span>
                            </div>
                        </div>
                    </div>
                </section> 

                {/*Security*/}
                <section className="table-container profile-security-section">
                    <div className="table-header">
                        <div>
                            <span className="eyebrow">Security</span>
                            <h3>Change Password</h3>
                        </div>
                    </div>
                    {!isVerified ? (
                        <div className="security-locked">
                            <div className="security-lock-icon">🔒</div>
                            <p className="security-lock-text">Confirm your identity before changing your password.</p>
                            <button type="button" className="panel-add-btn" onClick={() => setShowConfirm(true)}>
                                Confirm Identity.
                            </button>
                        </div>
                    ) : (
                        <div className="security-unlocked">
                            {pwSuccess && <p className="form-success">Password changed successfully.</p>}
                            <form className="modal-form" onSubmit={handlePasswordSubmit}>
                                <div className="modal-field">
                                    <label htmlFor="new-pw">New password</label>
                                    <input id="new-pw" type="password" value={newPassword} onChange={(e) => {setNewPassword(e.target.value); setPwSuccess(false);}} placeholder="At least 8 characters long." />
                                </div>
                                <div className="modal-field">
                                    <label htmlFor="confirm-pw">Confirm new password.</label>
                                    <input id="confirm-pw" type="password" value={confirmPw} onChange={(e) => {setConfirmPw(e.target.value); setPwSuccess(false);}} placeholder="Repeat new password" />
                                </div>
                                {pwError && <p className="modal-error">{pwError}</p>}
                                <div className="modal-actions">
                                    <button type="submit" className="table-action-link">Change Password</button>
                                </div>
                            </form>
                        </div>
                    )} 
                </section>

                {/*Admin: user management*/}
                {isAdmin && (
                    <section className="table-container profile-users">
                        <div className="table-header">
                            <div>
                                <span className="eyebrow">Admin</span>
                                <h3>User management</h3>
                            </div>
                            <div className="table-summary">
                                <strong>{systemUsers.length}</strong>
                                <span>users</span>
                            </div>
                        </div>
                        <div className="table-scroll">
                            <table className="devices-table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Current Role</th>
                                        <th>Change Role</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {systemUsers.map((user) => {
                                        const pending = pendingRoles[user.id] ?? user.role;
                                        const isDirty = pending !== user.role;
                                        return (
                                            <tr key={user.id}>
                                                <td><strong>{user.username}</strong></td>
                                                <td>{user.email}</td>
                                                <td><span className={roleBadgeClass(user.role)}>{user.role}</span></td>
                                                <td>
                                                    <select
                                                        className="role-select"
                                                        value={pending}
                                                        onChange={(e) => setPendingRoles((prev) => ({...prev, [user.id]: e.target.value}))}
                                                        >
                                                            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                                                        </select>
                                                </td>
                                                <td>
                                                    <button type="button" className="save-role-btn" disabled={!isDirty} onClick={() => handleRoleSave(user.id)}>
                                                        Save
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>

            {showConfirm && (
                <ConfirmIdentityModal onConfirm={() => setIsVerified(true)} onClose={() => setShowConfirm(false)} />
            )}
        </AppShell>
    );
}

export default ProfilePage;

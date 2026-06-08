import { useState, useEffect, type FormEvent } from "react";
import AppShell from "../components/AppShell";
import { useDashboardOverview, useDevices } from "../hooks/useDashboardData";
import { buildDashboardStats } from "../lib/dashboard";
import { getStoredEmail, getStoredRole, getStoredUsername } from "../lib/storage";
import api from "../services/api";
import { getApiErrorMessage } from "../lib/apiError";
import CustomSelect from "../components/CustomSelect";

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

function ResetPasswordModal({onClose, onSuccess}: {onClose: () => void; onSuccess: () => void}) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");

        if (!currentPassword.trim()) {
            setError("Please enter your current password.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        setIsLoading(true);

        try {
            await api.post("/auth/me/verify-password", { password: currentPassword });
            await api.put("/auth/me", { password: newPassword });
            onSuccess();
            onClose();
        } catch (error) {
            setError(getApiErrorMessage(error, "Unable to update password. Please try again."));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">×</button>
                <span className="eyebrow">Security</span>
                <h3>Forgot your password?</h3>
                <p className="modal-subtitle">Confirm your current password and choose a new one.</p>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="modal-field">
                        <label htmlFor="current-password">Current password</label>
                        <input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" autoFocus />
                    </div>
                    <div className="modal-field">
                        <label htmlFor="new-password">New password</label>
                        <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                    </div>
                    {error && <p className="modal-error">{error}</p>}
                    <div className="modal-actions">
                        <button type="button" className="ghost-action" onClick={onClose}>Cancel</button>
                        <button type="submit" className="table-action-link" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save password"}
                        </button>
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

    const [showResetModal, setShowResetModal] = useState(false);
    const [pwSuccess, setPwSuccess] = useState(false);
    type UserRecord = { id: string; username: string; email: string; role: string };
    const [systemUsers, setSystemUsers] = useState<UserRecord[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError] = useState("");
    const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});

    useEffect(() => {
        async function fetchUsers() {
            setUsersLoading(true);
            setUsersError("");
            try {
                const response = await api.get("/users");
                setSystemUsers(response.data.data || []); 
            } catch (error) {
                setUsersError(getApiErrorMessage(error, "Failed to load users."));
                setSystemUsers([])
            } finally {
                setUsersLoading(false);
            }
        }
        fetchUsers();
    }, []);

    

    const stats = buildDashboardStats({overview: overviewQuery.data, devices});
    
    async function handleRoleSave(userId: string) {
        const newRole = pendingRoles[userId];
        if(!newRole) return;

        try {
            await api.patch(`/users/${userId}/role`, {role: newRole});
            setSystemUsers((prev) => 
                prev.map((u) => (u.id === userId ? {...u, role: newRole} : u))
            );
            setPendingRoles((prev) => {
                const next = {...prev};
                delete next[userId];
                return next;
            });
        } catch (error) {
            console.error(error);
        }
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
                {/*Security*/}
                <section className="table-container profile-security-section">
                    <div className="table-header">
                        <div>
                            <span className="eyebrow">Security</span>
                            <h3>Change Password</h3>
                        </div>
                    </div>
                    <div className="security-locked">
                        {pwSuccess && <p className="form-success">Password changed successfully.</p>}
                        <button type="button" className="panel-add-btn" onClick={() => { setShowResetModal(true); setPwSuccess(false); }}>
                            Forgot your password? Confirm your identity and change it
                        </button>
                    </div>
                </section>
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
                        {usersLoading && <p className = "loading-text">Loading users...</p>}
                        {usersError && <p className="modal-error">{usersError}</p>}
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
                                                    <div className="profile-role-select">
                                                        <CustomSelect
                                                            value={pending}
                                                            options={ROLE_OPTIONS.map((r) => ({ value: r, label: r }))}
                                                            onChange={(value) => setPendingRoles((prev) => ({...prev, [user.id]: value}))}
                                                        />
                                                    </div>
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

            {showResetModal && (
                <ResetPasswordModal onSuccess={() => setPwSuccess(true)} onClose={() => setShowResetModal(false)} />
            )}
        </AppShell>
    );
}

export default ProfilePage;

import { useState, type FormEvent } from "react";
import AppShell from "../components/AppShell";
import { useDashboardOverview, useDevices, useGroups, useEmployees, useCreateGroupMutation, useCreateEmployeeMutation } from "../hooks/useDashboardData";
import { buildDashboardStats } from "../lib/dashboard";
import { getStoredRole } from "../lib/storage";
import type { CreateEmployeePayload, CreateGroupPayload, Group } from "../types/domain";

const EMPTY_DEVICES: never[] = [];
const ROLE_OPTIONS = ["Admin", "Operator", "Viewer"];

function roleBadgeClass(role: string) {
    if (role === "Admin") return "role-badge role-badge-admin";
    if (role === "Operator") return "role-badge role-badge-operator";
    return "role-badge role-badge-viewer";
}

function AddGroupModal({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const createGroup = useCreateGroupMutation();

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        const payload: CreateGroupPayload = { name: name.trim(), description: description.trim() };
        await createGroup.mutateAsync(payload);
        onClose();
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <span className="eyebrow">Groups</span>
                <h3>Add New Group</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="modal-field">
                        <label htmlFor="group-name">Name</label>
                        <input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Security Team" required />
                    </div>
                    <div className="modal-field">
                        <label htmlFor="group-desc">Description</label>
                        <input id="group-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this group handle?" />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="ghost-action" onClick={onClose}>Cancel</button>
                        <button type="submit" className="table-action-link" disabled={!name.trim() || createGroup.isPending}>
                            {createGroup.isPending ? "Adding..." : "Add Group"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AddEmployeeModal({ groups, onClose }: { groups: Group[]; onClose: () => void }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("Operator");
    const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
    const createEmployee = useCreateEmployeeMutation();

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !groupId) return;
        const payload: CreateEmployeePayload = { group_id: groupId, name: name.trim(), email: email.trim(), role };
        await createEmployee.mutateAsync(payload);
        onClose();
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <span className="eyebrow">Employees</span>
                <h3>Add New Employee</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="modal-field">
                        <label htmlFor="emp-name">Name</label>
                        <input id="emp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
                    </div>
                    <div className="modal-field">
                        <label htmlFor="emp-email">Email</label>
                        <input id="emp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@sentrynet.io" required />
                    </div>
                    <div className="modal-field">
                        <label htmlFor="emp-role">Role</label>
                        <select id="emp-role" value={role} onChange={(e) => setRole(e.target.value)}>
                            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="modal-field">
                        <label htmlFor="emp-group">Group</label>
                        <select id="emp-group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="ghost-action" onClick={onClose}>Cancel</button>
                        <button type="submit" className="table-action-link" disabled={!name.trim() || !email.trim() || createEmployee.isPending}>
                            {createEmployee.isPending ? "Adding..." : "Add Employee"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function GroupsPage() {
    const overviewQuery = useDashboardOverview();
    const devicesQuery = useDevices();
    const groupsQuery = useGroups();
    const employeesQuery = useEmployees();
    const devices = devicesQuery.data ?? EMPTY_DEVICES;
    const groups = groupsQuery.data ?? [];
    const employees = employeesQuery.data ?? [];
    const isAdmin = getStoredRole().toLowerCase() === "admin";

    const [showAddGroup, setShowAddGroup] = useState(false);
    const [showAddEmp, setShowAddEmp] = useState(false);

    const stats = buildDashboardStats({ overview: overviewQuery.data, devices });

    return (
        <AppShell stats={stats} headerSlot={<span className="eyebrow">Groups & Employees</span>}>
            <section className="page-summary">
                <div className="summary-metrics">
                    <div className="summary-metric">
                        <span>Groups</span>
                        <strong>{groups.length}</strong>
                    </div>
                    <div className="summary-metric">
                        <span>Employees</span>
                        <strong>{employees.length}</strong>
                    </div>
                    <div className="summary-metric summary-metric-wide">
                        <span>Access level</span>
                        <strong>{isAdmin ? "Admin - full management access" : "Read-only view"}</strong>
                    </div>
                </div>
            </section>

            <div className="groups-body">
                <section className="table-container">
                    <div className="groups-panel-header">
                        <div>
                            <span className="eyebrow">Groups</span>
                            <h3 style={{ margin: 0 }}>All groups</h3>
                        </div>
                        {isAdmin && (
                            <button type="button" className="panel-add-btn" onClick={() => setShowAddGroup(true)}>
                                +Add group
                            </button>
                        )}
                    </div>
                    <div className="groups-panel-body">
                        {groupsQuery.isLoading && <p style={{ padding: "1rem" }}>Loading groups...</p>}
                        {groups.map((group) => {
                            const count = employees.filter((e) => e.group_id === group.id).length;
                            return (
                                <div key={group.id} className="group-card">
                                    <div className="group-card-row">
                                        <strong>{group.name}</strong>
                                        <span className="group-member-badge">{count} {count === 1 ? "member" : "members"}</span>
                                    </div>
                                    {group.description && <p className="group-card-desc">{group.description}</p>}
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="table-container">
                    <div className="groups-panel-header">
                        <div>
                            <span className="eyebrow">Employees</span>
                            <h3 style={{ margin: 0 }}>All employees</h3>
                        </div>
                        {isAdmin && (
                            <button type="button" className="panel-add-btn" onClick={() => setShowAddEmp(true)}>
                                +Add Employee
                            </button>
                        )}
                    </div>
                    <div className="table-scroll">
                        <table className="devices-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Group</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeesQuery.isLoading && (
                                    <tr><td colSpan={4} style={{ textAlign: "center" }}>Loading...</td></tr>
                                )}
                                {employees.map((emp) => (
                                    <tr key={emp.id}>
                                        <td><strong>{emp.name}</strong></td>
                                        <td>{emp.email}</td>
                                        <td><span className={roleBadgeClass(emp.role)}>{emp.role}</span></td>
                                        <td>{emp.group?.name ?? emp.group_id}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {showAddGroup && <AddGroupModal onClose={() => setShowAddGroup(false)} />}
            {showAddEmp && <AddEmployeeModal groups={groups} onClose={() => setShowAddEmp(false)} />}
        </AppShell>
    );
}

export default GroupsPage;

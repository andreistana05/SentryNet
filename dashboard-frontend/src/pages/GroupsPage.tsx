import { useState, type FormEvent } from "react";
import AppShell from "../components/AppShell";
import { useDashboardOverview, useDevices } from "../hooks/useDashboardData";
import { buildDashboardStats } from "../lib/dashboard";
import { getStoredRole } from "../lib/storage";
import type { Employee, Group } from "../types/domain";

const EMPTY_DEVICES: never[] = [];
const ROLE_OPTIONS = ["Admin", "Operator", "Viewer"];

const INITIAL_GROUPS: Group[] = [
    { id: 1, name: "IT Support", description: "Handles internal IT helpdesk requests" },
    { id: 2, name: "Network Team", description: "Manages network infrastructure and connectivity"},
    { id: 3, name: "DBA Team", description: "Database administration and maintenance"},
    { id: 4, name: "Facilities", description: "Physical infrastructure and hardware"},
];

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 1, name: "Andrei",   email: "andrei@sentrynet.io",   role: "Admin",    group: "IT Support" },
  { id: 2, name: "Marcel",   email: "marcel@sentrynet.io",   role: "Operator", group: "Network Team" },
  { id: 3, name: "Ioana",    email: "ioana@sentrynet.io",    role: "Operator", group: "IT Support" },
  { id: 4, name: "Bogdan",   email: "bogdan@sentrynet.io",   role: "Viewer",   group: "DBA Team" },
  { id: 5, name: "Cristina", email: "cristina@sentrynet.io", role: "Operator", group: "Network Team" },
  { id: 6, name: "Stefan",   email: "stefan@sentrynet.io",   role: "Viewer",   group: "Facilities" },
  { id: 7, name: "Ana",      email: "ana@sentrynet.io",      role: "Operator", group: "DBA Team" },
  { id: 8, name: "Mihai",    email: "mihai@sentrynet.io",    role: "Operator", group: "IT Support" },
];

function roleBadgeClass(role: string) {
    if(role === "Admin") return "role-badge role-badge-admin";
    if(role === "Operator") return "role-badge role-badge-operator";
    return "role-badge role-badge-viewer";
}

function AddGroupModal({groups, onAdd, onClose}: {groups: Group[]; onAdd: (g: Group) => void; onClose: () => void}) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if(!name.trim()) return;
        onAdd({id: Math.max(0, ...groups.map((g) => g.id)) + 1, name: name.trim(), description: description.trim() });
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
                        <input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Security Team" required/>
                    </div>
                    <div className="modal-field">
                        <label htmlFor="group-desc">Description</label>
                        <input id="group-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this group handle?" />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="ghost-action" onClick={onClose}>Cancel</button>
                        <button type="submit" className="table-action-link" disabled={!name.trim()}>Add Group</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function AddEmployeeModal({groups, employees, onAdd, onClose}: {groups: Group[]; employees: Employee[]; onAdd: (e: Employee) => void; onClose: () => void}) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("Operator");
    const [group, setGroup] = useState(groups[0]?.name ?? "");

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if(!name.trim() || !email.trim()) return;
        onAdd({id: Math.max(0, ...employees.map((e) => e.id)) + 1, name: name.trim(), email: email.trim(), role, group});
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
                        <input id="emp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required></input>
                    </div>
                    <div className="modal-field">
                        <label htmlFor="emp-email">Email</label>
                        <input id="emp-name" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@sentrynet.io" required />
                    </div>
                    <div className="modal-field">
                        <label htmlFor="emp-role">Role</label>
                        <select id="emp-role" value={role} onChange={(e) => setRole(e.target.value)}>
                            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="modal-field">
                        <label htmlFor="emp-group">Group</label>
                        <select id="emp-group" value={group} onChange={(e) => setGroup(e.target.value)}>
                            {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}    
                        </select> 
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="ghost-action" onClick={onClose}>Cancel</button>
                        <button type="submit" className="table-action-link" disabled={!name.trim() || !email.trim()}>Add Employee</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function GroupsPage() {
    const overviewQuery = useDashboardOverview();
    const devicesQuery = useDevices();
    const devices = devicesQuery.data ?? EMPTY_DEVICES;
    const isAdmin = getStoredRole().toLowerCase() === "admin";
    
    const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
    const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
    const [showAddGroup, setShowAddGroup] = useState(false);
    const [showAddEmp, setShowAddEmp] = useState(false);

    const stats = buildDashboardStats({overview: overviewQuery.data, devices});

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
                            <h3 style={{margin: 0}}>All groups</h3>
                        </div>
                        {isAdmin && (
                            <button type="button" className="panel-add-btn" onClick={() => setShowAddGroup(true)}>
                                +Add group
                            </button>
                        )}
                    </div>
                    <div className="groups-panel-body">
                        {groups.map((group) => {
                            const count = employees.filter((e) => e.group === group.name).length;
                            return (
                                <div key={group.id} className="group-card">
                                    <div className="group-card-row">
                                        <strong>{group.name}</strong>
                                        <span className="group-member-badge">{count} {count === 1 ? "member" : "member"}</span>
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
                            <h3 style={{margin: 0}}>All employees</h3>
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
                                {employees.map((emp) => (
                                    <tr key={emp.id}>
                                        <td><strong>{emp.name}</strong></td>
                                        <td>{emp.email}</td>
                                        <td><span className={roleBadgeClass(emp.role)}>{emp.role}</span></td>
                                        <td>{emp.group}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {showAddGroup && (
                <AddGroupModal
                    groups={groups}
                    onAdd={(g) => setGroups((prev) => [...prev, g])}
                    onClose={() => setShowAddGroup(false)}
                />
            )}
            {showAddEmp && (
                <AddEmployeeModal
                    groups={groups}
                    employees={employees}
                    onAdd={(e) => setEmployees((prev) => [...prev, e])}
                    onClose={() => setShowAddEmp(false)}
                />
            )}
        </AppShell>
    );
}

export default GroupsPage;

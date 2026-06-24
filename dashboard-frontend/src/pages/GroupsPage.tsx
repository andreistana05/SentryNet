import { useState, type FormEvent } from "react";
import AppShell from "../components/AppShell";
import CustomSelect from "../components/CustomSelect";
import { useDashboardOverview, useDevices, useGroups, useEmployees, useCreateGroupMutation, useCreateEmployeeMutation, useDeleteGroupMutation, useDeleteEmployeeMutation } from "../hooks/useDashboardData";
import { buildDashboardStats } from "../lib/dashboard";
import { getStoredRole } from "../lib/storage";
import type { CreateEmployeePayload, CreateGroupPayload, Employee, Group } from "../types/domain";

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
                        <label>Role</label>
                        <CustomSelect
                            value={role}
                            options={ROLE_OPTIONS.map((r) => ({ value: r, label: r }))}
                            onChange={setRole}
                            ariaLabel="Select employee role"
                        />
                    </div>
                    <div className="modal-field">
                        <label>Group</label>
                        <CustomSelect
                            value={groupId}
                            options={groups.map((g) => ({ value: g.id, label: g.name }))}
                            onChange={setGroupId}
                            ariaLabel="Select employee group"
                            disabled={groups.length === 0}
                        />
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

function GroupManagerModal({ groups, onClose, deleteGroup }: { groups: Group[]; onClose: () => void; deleteGroup: ReturnType<typeof useDeleteGroupMutation> }) {
    const [action, setAction] = useState<"add" | "delete">("add");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const createGroup = useCreateGroupMutation();

    const selectedGroup = groups.find((group) => group.id === deleteTarget);

    async function handleAddSubmit(e: FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        await createGroup.mutateAsync({ name: name.trim(), description: description.trim() });
        onClose();
    }

    async function handleDeleteConfirm() {
        if (!selectedGroup) return;
        await deleteGroup.mutateAsync(selectedGroup.id);
        setDeleteTarget(null);
        onClose();
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <span className="eyebrow">Groups</span>
                <h3>Manage groups</h3>
                <div className="modal-field">
                    <label>Action</label>
                    <CustomSelect
                        value={action}
                        options={[{ label: "Add", value: "add" }, { label: "Delete", value: "delete" }]}
                        onChange={(value) => setAction(value as "add" | "delete")}
                        ariaLabel="Select group action"
                    />
                </div>
                {action === "add" ? (
                    <form className="modal-form" onSubmit={handleAddSubmit}>
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
                ) : (
                    <div>
                        <p className="modal-description">Are you sure you want to delete a group? Select a group below and confirm.</p>
                        <div className="groups-panel-body">
                            {groups.length === 0 ? (
                                <p>No groups available to delete.</p>
                            ) : groups.map((group) => {
                                const count = employees.filter((e) => e.group_id === group.id).length;
                                return (
                                    <div key={group.id} className="group-card">
                                        <div className="group-card-row">
                                            <strong>{group.name}</strong>
                                            <span className="group-member-badge">{count} {count === 1 ? "member" : "members"}</span>
                                        </div>
                                        {group.description && <p className="group-card-desc">{group.description}</p>}
                                        <div className="modal-actions">
                                            <button type="button" className="table-action-link danger-action" onClick={() => setDeleteTarget(group.id)}>
                                                Delete
                                            </button>
                                            {deleteTarget === group.id && (
                                                <div className="delete-confirmation">
                                                    <p>Are you sure you want to delete this group?</p>
                                                    <button type="button" className="table-action-link danger-action" onClick={handleDeleteConfirm}>
                                                        Confirm
                                                    </button>
                                                    <button type="button" className="ghost-action" onClick={() => setDeleteTarget(null)}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="modal-actions">
                    <button type="button" className="ghost-action" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function EmployeeManagerModal({ employees, groups, onClose, deleteEmployee }: { employees: Employee[]; groups: Group[]; onClose: () => void; deleteEmployee: ReturnType<typeof useDeleteEmployeeMutation> }) {
    const [action, setAction] = useState<"add" | "delete">("add");
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("Operator");
    const createEmployee = useCreateEmployeeMutation();

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !selectedGroupId) return;
        const payload: CreateEmployeePayload = { group_id: selectedGroupId, name: name.trim(), email: email.trim(), role };
        await createEmployee.mutateAsync(payload);
        onClose();
    }

    const selectedEmployee = employees.find((employee) => employee.id === deleteTarget);

    async function handleDeleteConfirm() {
        if (!selectedEmployee) return;
        await deleteEmployee.mutateAsync(selectedEmployee.id);
        setDeleteTarget(null);
        onClose();
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <span className="eyebrow">Employees</span>
                <h3>Manage employees</h3>
                <div className="modal-field">
                    <label>Action</label>
                    <CustomSelect
                        value={action}
                        options={[{ label: "Add", value: "add" }, { label: "Delete", value: "delete" }]}
                        onChange={(value) => setAction(value as "add" | "delete")}
                        ariaLabel="Select employee action"
                    />
                </div>
                {action === "add" ? (
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
                            <label>Role</label>
                            <CustomSelect
                                value={role}
                                options={ROLE_OPTIONS.map((r) => ({ value: r, label: r }))}
                                onChange={setRole}
                                ariaLabel="Select employee role"
                            />
                        </div>
                        <div className="modal-field">
                            <label>Group</label>
                            <CustomSelect
                                value={selectedGroupId}
                                options={groups.map((g) => ({ value: g.id, label: g.name }))}
                                onChange={setSelectedGroupId}
                                ariaLabel="Select employee group"
                                disabled={groups.length === 0}
                            />
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="ghost-action" onClick={onClose}>Cancel</button>
                            <button type="submit" className="table-action-link" disabled={!name.trim() || !email.trim() || createEmployee.isPending}>
                                {createEmployee.isPending ? "Adding..." : "Add Employee"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <p className="modal-description">Are you sure you want to delete an employee? Select an employee below and confirm.</p>
                        <div className="employee-delete-list">
                            {employees.length === 0 ? (
                                <p>No employees available to delete.</p>
                            ) : (
                                <table className="devices-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Group</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map((emp) => (
                                            <tr key={emp.id}>
                                                <td><strong>{emp.name}</strong></td>
                                                <td>{emp.email}</td>
                                                <td><span className={roleBadgeClass(emp.role)}>{emp.role}</span></td>
                                                <td>{emp.group?.name ?? emp.group_id}</td>
                                                <td>
                                                    <button type="button" className="table-action-link danger-action" onClick={() => setDeleteTarget(emp.id)}>
                                                        Delete
                                                    </button>
                                                    {deleteTarget === emp.id && (
                                                        <div className="delete-confirmation">
                                                            <p>Are you sure you want to delete this user?</p>
                                                            <button type="button" className="table-action-link danger-action" onClick={handleDeleteConfirm}>
                                                                Confirm
                                                            </button>
                                                            <button type="button" className="ghost-action" onClick={() => setDeleteTarget(null)}>
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
                <div className="modal-actions">
                    <button type="button" className="ghost-action" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function DeleteConfirmModal({ itemName, entityType, onCancel, onConfirm }: { itemName: string; entityType: "group" | "employee"; onCancel: () => void; onConfirm: () => void }) {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <span className="eyebrow">Confirm delete</span>
                <h3>Delete {entityType}</h3>
                <p style={{ margin: "1rem 0" }}>
                    Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
                </p>
                <div className="modal-actions">
                    <button type="button" className="ghost-action" onClick={onCancel}>Cancel</button>
                    <button type="button" className="table-action-link danger-action" onClick={onConfirm}>Delete</button>
                </div>
            </div>
        </div>
    );
}

function GroupsPage() {
    const overviewQuery = useDashboardOverview();
    const devicesQuery = useDevices();
    const groupsQuery = useGroups();
    const employeesQuery = useEmployees();
    const deleteGroup = useDeleteGroupMutation();
    const deleteEmployee = useDeleteEmployeeMutation();
    const devices = devicesQuery.data ?? EMPTY_DEVICES;
    const groups = groupsQuery.data ?? [];
    const employees = employeesQuery.data ?? [];
    const isAdmin = getStoredRole().toLowerCase() === "admin";

    const [showAddGroup, setShowAddGroup] = useState(false);
    const [showAddEmp, setShowAddEmp] = useState(false);
    const [deleteGroupTarget, setDeleteGroupTarget] = useState<Group | null>(null);
    const [deleteEmployeeTarget, setDeleteEmployeeTarget] = useState<Employee | null>(null);

    const confirmDeleteGroup = async () => {
        if (!isAdmin || !deleteGroupTarget) return;
        await deleteGroup.mutateAsync(deleteGroupTarget.id);
        setDeleteGroupTarget(null);
    };

    const confirmDeleteEmployee = async () => {
        if (!isAdmin || !deleteEmployeeTarget) return;
        await deleteEmployee.mutateAsync(deleteEmployeeTarget.id);
        setDeleteEmployeeTarget(null);
    };

    const cancelDeleteGroup = () => setDeleteGroupTarget(null);
    const cancelDeleteEmployee = () => setDeleteEmployeeTarget(null);

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
                                Manage groups
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
                                        <div className="group-card-actions">
                                            <span className="group-member-badge">{count} {count === 1 ? "member" : "members"}</span>
                                            {isAdmin && (
                                                <button
                                                    type="button"
                                                    className="table-action-link danger-action"
                                                    onClick={() => setDeleteGroupTarget(group)}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
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
                                Manage employees
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
                                    {isAdmin && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {employeesQuery.isLoading && (
                                    <tr><td colSpan={isAdmin ? 5 : 4} style={{ textAlign: "center" }}>Loading...</td></tr>
                                )}
                                {employees.map((emp) => (
                                    <tr key={emp.id}>
                                        <td><strong>{emp.name}</strong></td>
                                        <td>{emp.email}</td>
                                        <td><span className={roleBadgeClass(emp.role)}>{emp.role}</span></td>
                                        <td>{emp.group?.name ?? emp.group_id}</td>
                                        {isAdmin && (
                                            <td>
                                                <button
                                                    type="button"
                                                    className="table-action-link danger-action"
                                                    onClick={() => setDeleteEmployeeTarget(emp)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {showAddGroup && <AddGroupModal onClose={() => setShowAddGroup(false)} />}
            {showAddEmp && <AddEmployeeModal groups={groups} onClose={() => setShowAddEmp(false)} />}
            {deleteGroupTarget && (
                <DeleteConfirmModal
                    itemName={deleteGroupTarget.name}
                    entityType="group"
                    onCancel={cancelDeleteGroup}
                    onConfirm={confirmDeleteGroup}
                />
            )}
            {deleteEmployeeTarget && (
                <DeleteConfirmModal
                    itemName={deleteEmployeeTarget.name}
                    entityType="employee"
                    onCancel={cancelDeleteEmployee}
                    onConfirm={confirmDeleteEmployee}
                />
            )}
        </AppShell>
    );
}

export default GroupsPage;

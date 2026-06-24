import { extractCollection } from "../lib/collections";
import {
  alarmSchema,
  collectionEnvelopeSchema,
  deviceMetricsSchema,
  deviceSchema,
  incidentSchema,
  overviewSchema,
  problemSchema,
  ticketSchema,
  ticketNoteSchema,
  groupSchema,
  employeeSchema,
} from "../lib/schemas";
import type {
  Alarm,
  CreateTicketNotePayload,
  DashboardOverview,
  Device,
  DeviceMetricsPayload,
  Incident,
  OperationType,
  Problem,
  Ticket,
  TicketNote,
  TicketStatus,
  UpdateTicketStatusPayload,
  Group,
  Employee,
  CreateGroupPayload,
  CreateEmployeePayload,
} from "../types/domain";
import { getValidated, patchValidated, postValidated, deleteValidated } from "./api";

const devicesEnvelopeSchema = collectionEnvelopeSchema(deviceSchema);
const alarmsEnvelopeSchema = collectionEnvelopeSchema(alarmSchema);
const incidentsEnvelopeSchema = collectionEnvelopeSchema(incidentSchema);
const ticketsEnvelopeSchema = collectionEnvelopeSchema(ticketSchema);
const problemsEnvelopeSchema = collectionEnvelopeSchema(problemSchema);
const ticketNotesEnvelopeSchema = collectionEnvelopeSchema(ticketNoteSchema);
const groupsEnvelopeSchema = collectionEnvelopeSchema(groupSchema);
const employeesEnvelopeSchema = collectionEnvelopeSchema(employeeSchema);

export const TICKET_STATUS_OPTIONS: TicketStatus[] = [
  "assigned",
  "in-progress",
  "awaiting-vendor",
  "mitigating",
  "root-cause-analysis",
  "resolved",
  "closed",
];

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return getValidated("/status", overviewSchema);
}

export async function getDevices(): Promise<Device[]> {
  const payload = await getValidated("/devices", devicesEnvelopeSchema);
  return extractCollection(payload);
}

type OperationsMap = {
  alarms: Alarm[];
  incidents: Incident[];
  tickets: Ticket[];
  problems: Problem[];
};

export async function getOperations<T extends OperationType>(type: T): Promise<OperationsMap[T]> {
  const schemaMap = {
    alarms: alarmsEnvelopeSchema,
    incidents: incidentsEnvelopeSchema,
    tickets: ticketsEnvelopeSchema,
    problems: problemsEnvelopeSchema,
  };

  const payload = await getValidated(`/${type}`, schemaMap[type]);
  return extractCollection(payload) as OperationsMap[T];
}

export async function getDeviceMetrics(deviceId: string | number, from?: string, to?: string): Promise<DeviceMetricsPayload> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return getValidated(`/devices/${deviceId}/metrics${qs ? `?${qs}` : ""}`, deviceMetricsSchema);
}

export async function updateTicketStatus(
  ticketId: string | number,
  payload: UpdateTicketStatusPayload,
): Promise<Ticket> {
  return patchValidated(`/tickets/${ticketId}/status`, payload, ticketSchema);
}

export async function getTicketNotes(ticketId: string | number): Promise<TicketNote[]> {
  const payload = await getValidated(`/tickets/${ticketId}/notes`, ticketNotesEnvelopeSchema);
  return extractCollection(payload);
}

export async function createTicketNote(
  ticketId: string | number,
  payload: CreateTicketNotePayload,
): Promise<TicketNote> {
  return postValidated(`/tickets/${ticketId}/notes`, payload, ticketNoteSchema);
}

export async function getGroups(): Promise<Group[]> {
  const payload = await getValidated("/groups", groupsEnvelopeSchema);
  return extractCollection(payload);
}

export async function createGroup(payload: CreateGroupPayload): Promise<Group> {
  return postValidated("/groups", payload, groupSchema);
}

export async function deleteGroup(groupId: string | number): Promise<void> {
  return deleteValidated(`/groups/${groupId}`);
}

export async function getEmployees(groupId?: string): Promise<Employee[]> {
  const qs = groupId ? `?group_id=${groupId}` : "";
  const payload = await getValidated(`/employees${qs}`, employeesEnvelopeSchema);
  return extractCollection(payload);
}

export async function createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
  return postValidated("/employees", payload, employeeSchema);
}

export async function deleteEmployee(employeeId: string | number): Promise<void> {
  return deleteValidated(`/employees/${employeeId}`);
}
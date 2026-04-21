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
} from "../lib/schemas";
import type {
  Alarm,
  DashboardOverview,
  Device,
  DeviceMetricsPayload,
  Incident,
  OperationType,
  Problem,
  Ticket,
  TicketStatus,
  UpdateTicketStatusPayload,
} from "../types/domain";
import { getValidated, patchValidated } from "./api";

const devicesEnvelopeSchema = collectionEnvelopeSchema(deviceSchema);
const alarmsEnvelopeSchema = collectionEnvelopeSchema(alarmSchema);
const incidentsEnvelopeSchema = collectionEnvelopeSchema(incidentSchema);
const ticketsEnvelopeSchema = collectionEnvelopeSchema(ticketSchema);
const problemsEnvelopeSchema = collectionEnvelopeSchema(problemSchema);

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

export async function getDeviceMetrics(deviceId: string | number): Promise<DeviceMetricsPayload> {
  return getValidated(`/devices/${deviceId}/metrics`, deviceMetricsSchema);
}

export async function updateTicketStatus(
  ticketId: string | number,
  payload: UpdateTicketStatusPayload,
): Promise<Ticket> {
  // This is the single backend integration point for inline ticket updates.
  // If the API uses a different route or request body, update it here.
  return patchValidated(`/tickets/${ticketId}/status`, payload, ticketSchema);
}

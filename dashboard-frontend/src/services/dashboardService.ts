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
} from "../types/domain";
import { getValidated } from "./api";

const devicesEnvelopeSchema = collectionEnvelopeSchema(deviceSchema);
const alarmsEnvelopeSchema = collectionEnvelopeSchema(alarmSchema);
const incidentsEnvelopeSchema = collectionEnvelopeSchema(incidentSchema);
const ticketsEnvelopeSchema = collectionEnvelopeSchema(ticketSchema);
const problemsEnvelopeSchema = collectionEnvelopeSchema(problemSchema);

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

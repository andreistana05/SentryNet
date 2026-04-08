import { z } from "zod";

const idSchema = z.union([z.string(), z.number()]);

const statusBucketSchema = z
  .object({
    total: z.coerce.number().catch(0),
    online: z.coerce.number().catch(0),
  })
  .catch({
    total: 0,
    online: 0,
  });

const openBucketSchema = z
  .object({
    open: z.coerce.number().catch(0),
  })
  .catch({ open: 0 });

export const overviewSchema = z.object({
  devices: statusBucketSchema,
  alarms: openBucketSchema,
  incidents: openBucketSchema,
  tickets: openBucketSchema,
  problems: openBucketSchema,
});

const looseDeviceSchema = z
  .object({
    id: idSchema,
    name: z.string().catch("Unnamed device"),
    type: z.string().catch("Unknown"),
    status: z.string().catch("unknown"),
    ip_address: z.string().nullish(),
    ip: z.string().nullish(),
    last_seen: z.string().nullish(),
    lastSeen: z.string().nullish(),
    metrics: z.unknown().optional(),
    telemetry: z.unknown().optional(),
  })
  .passthrough();

export const deviceSchema = looseDeviceSchema.transform((device) => ({
  id: device.id,
  name: device.name,
  type: device.type,
  status: device.status,
  ipAddress: device.ip_address || device.ip || "Unavailable",
  lastSeen: device.last_seen || device.lastSeen || null,
  metrics: device.metrics,
  telemetry: device.telemetry,
}));

const operationRecordSchema = z
  .object({
    id: idSchema,
    title: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const alarmSchema = operationRecordSchema;
export const incidentSchema = operationRecordSchema;
export const ticketSchema = operationRecordSchema;
export const problemSchema = operationRecordSchema;

export const deviceMetricsSchema = z
  .object({
    metrics: z.unknown().optional(),
    telemetry: z.unknown().optional(),
    data: z.unknown().optional(),
  })
  .passthrough();

export const authSuccessSchema = z.object({
  token: z.string(),
  role: z.string().optional(),
  user: z
    .object({
      role: z.string().optional(),
    })
    .optional(),
});

export const loginPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerPayloadSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

export const collectionEnvelopeSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.union([
    z.array(itemSchema),
    z.object({ data: z.array(itemSchema) }),
    z.object({ items: z.array(itemSchema) }),
  ]);

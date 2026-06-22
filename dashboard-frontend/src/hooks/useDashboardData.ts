import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "../lib/apiError";
import { clearStoredAuth, getStoredUsername, setStoredRole, setStoredToken, setStoredUsername, setStoredEmail } from "../lib/storage";
import type {
  Alarm,
  CreateTicketNotePayload,
  DashboardOverview,
  Device,
  DeviceMetricsPayload,
  Incident,
  LoginPayload,
  OperationType,
  Problem,
  RegisterPayload,
  Ticket,
  TicketNote,
  TicketStatus,
  Group,
  Employee,
  CreateEmployeePayload,
  CreateGroupPayload,
} from "../types/domain";
import { loginUser, registerUser } from "../services/authService";
import {
  getDashboardOverview,
  getDeviceMetrics,
  getDevices,
  getOperations,
  getTicketNotes,
  updateTicketStatus,
  createTicketNote,
  getGroups,
  createGroup,
  getEmployees,
  createEmployee,
} from "../services/dashboardService";

export function useDashboardOverview() {
  return useQuery<DashboardOverview>({
    queryKey: ["overview"],
    queryFn: getDashboardOverview,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useDevices() {
  return useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: getDevices,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

type OperationsMap = {
  alarms: Alarm[];
  incidents: Incident[];
  tickets: Ticket[];
  problems: Problem[];
};

export function useOperations<T extends OperationType>(type: T) {
  return useQuery<OperationsMap[T]>({
    queryKey: ["operations", type],
    queryFn: () => getOperations(type) as Promise<OperationsMap[T]>,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

export function useDeviceMetrics(deviceId: string | number | null | undefined) {
  return useQuery<DeviceMetricsPayload>({
    queryKey: ["device-metrics", deviceId],
    queryFn: () => getDeviceMetrics(deviceId as string | number),
    enabled: Boolean(deviceId),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

const RANGE_MS: Record<string, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

export function useDeviceMetricsHistory(deviceId: string | number | null | undefined, range: string) {
  return useQuery<DeviceMetricsPayload>({
    queryKey: ["device-metrics-history", deviceId, range],
    queryFn: () => {
      const from = new Date(Date.now() - (RANGE_MS[range] ?? RANGE_MS["1h"])).toISOString();
      return getDeviceMetrics(deviceId as string | number, from);
    },
    enabled: Boolean(deviceId),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export function useUpdateTicketStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string | number; status: TicketStatus }) =>
      updateTicketStatus(ticketId, { status }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["operations", "tickets"] });

      const previousTickets = queryClient.getQueryData<Ticket[]>(["operations", "tickets"]);

      queryClient.setQueryData<Ticket[]>(["operations", "tickets"], (current) =>
        current?.map((ticket) =>
          String(ticket.id) === String(variables.ticketId) ? { ...ticket, status: variables.status } : ticket,
        ),
      );

      return { previousTickets };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTickets) {
        queryClient.setQueryData(["operations", "tickets"], context.previousTickets);
      }
    },
    onSuccess: (updatedTicket) => {
      queryClient.setQueryData<Ticket[]>(["operations", "tickets"], (current) =>
        current?.map((ticket) => (String(ticket.id) === String(updatedTicket.id) ? { ...ticket, ...updatedTicket } : ticket)),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["operations", "tickets"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useTicketNotes(ticketId: string | number | null | undefined) {
  return useQuery<TicketNote[]>({
    queryKey: ["ticket-notes", ticketId],
    queryFn: () => getTicketNotes(ticketId as string | number),
    enabled: Boolean(ticketId),
    staleTime: 15_000,
  });
}

export function useCreateTicketNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, payload }: { ticketId: string | number; payload: CreateTicketNotePayload }) =>
      createTicketNote(ticketId, payload),
    onMutate: async ({ ticketId, payload }) => {
      const queryKey = ["ticket-notes", ticketId] as const;
      await queryClient.cancelQueries({ queryKey });

      const previousNotes = queryClient.getQueryData<TicketNote[]>(queryKey);
      const optimisticNote: TicketNote = {
        id: `temp-${Date.now()}`,
        ticketId,
        body: payload.body,
        authorName: getStoredUsername(),
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<TicketNote[]>(queryKey, (current) => [...(current ?? []), optimisticNote]);

      return { previousNotes, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousNotes);
      }
    },
    onSuccess: (note, variables) => {
      queryClient.setQueryData<TicketNote[]>(["ticket-notes", variables.ticketId], (current) => {
        const withoutOptimistic = (current ?? []).filter((entry) => !String(entry.id).startsWith("temp-"));
        return [...withoutOptimistic, note];
      });
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticket-notes", variables.ticketId] });
    },
  });
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const response = await loginUser(payload);
      setStoredToken(response.token);
      setStoredEmail(payload.email);
      setStoredUsername(response.user?.username || response.username || payload.email.split("@")[0]);
      if (response.role) {
        setStoredRole(response.role);
      } else if (response.user?.role) {
        setStoredRole(response.user.role);
      }
      return response;
    },
    onError: () => {
      clearStoredAuth();
    },
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const response = await registerUser(payload);
      setStoredToken(response.token);
      setStoredEmail(payload.email);
      setStoredUsername(response.user?.username || response.username || payload.username);
      if (response.user?.role) {
        setStoredRole(response.user.role);
      } else if (response.role) {
        setStoredRole(response.role);
      }
      return response;
    },
    onError: () => {
      clearStoredAuth();
    },
  });
}

export function getMutationErrorMessage(error: unknown, fallback: string): string {
  return getApiErrorMessage(error, fallback);
}

export function useGroups() {
  return useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: getGroups,
    staleTime: 60_000,
  });
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGroupPayload) => createGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["groups"]});
    },
  });
}

export function useEmployees(groupId?: string) {
  return useQuery<Employee[]>({
    queryKey: ["employees", groupId],
    queryFn: () => getEmployees(groupId),
    staleTime: 60_000,
  });
}

export function useCreateEmployeeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEmployeePayload) => createEmployee(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["employees"]});
    },
  });
}

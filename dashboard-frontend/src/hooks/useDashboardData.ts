import { useMutation, useQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "../lib/apiError";
import { clearStoredAuth, setStoredRole, setStoredToken } from "../lib/storage";
import type {
  Alarm,
  DashboardOverview,
  Device,
  DeviceMetricsPayload,
  Incident,
  LoginPayload,
  OperationType,
  Problem,
  RegisterPayload,
  Ticket,
} from "../types/domain";
import { loginUser, registerUser } from "../services/authService";
import {
  getDashboardOverview,
  getDeviceMetrics,
  getDevices,
  getOperations,
} from "../services/dashboardService";

export function useDashboardOverview() {
  return useQuery<DashboardOverview>({
    queryKey: ["overview"],
    queryFn: getDashboardOverview,
    staleTime: 30_000,
  });
}

export function useDevices() {
  return useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: getDevices,
    staleTime: 30_000,
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
  });
}

export function useDeviceMetrics(deviceId: string | number | null | undefined) {
  return useQuery<DeviceMetricsPayload>({
    queryKey: ["device-metrics", deviceId],
    queryFn: () => getDeviceMetrics(deviceId as string | number),
    enabled: Boolean(deviceId),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const response = await loginUser(payload);
      setStoredToken(response.token);
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

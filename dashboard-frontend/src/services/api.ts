import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import type { ZodType } from "zod";
import { getStoredToken } from "../lib/storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getValidated<T>(
  url: string,
  schema: ZodType<T>,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.get(url, config);
  return schema.parse(response.data);
}

export async function postValidated<TResponse, TPayload>(
  url: string,
  payload: TPayload,
  schema: ZodType<TResponse>,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const response = await api.post(url, payload, config);
  return schema.parse(response.data);
}

export { API_BASE_URL };
export default api;

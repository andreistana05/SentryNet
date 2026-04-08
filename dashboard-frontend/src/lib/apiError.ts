import axios from "axios";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { error?: unknown; message?: unknown } | undefined;
    return (
      (typeof responseData?.error === "string" && responseData.error) ||
      (typeof responseData?.message === "string" && responseData.message) ||
      fallback
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

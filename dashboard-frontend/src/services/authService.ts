import { authSuccessSchema, loginPayloadSchema, registerPayloadSchema } from "../lib/schemas";
import type { AuthSuccess, LoginPayload, RegisterPayload } from "../types/domain";
import { postValidated } from "./api";

export async function loginUser(payload: LoginPayload): Promise<AuthSuccess> {
  const parsedPayload = loginPayloadSchema.parse(payload);
  return postValidated("/auth/login", parsedPayload, authSuccessSchema);
}

export async function registerUser(payload: RegisterPayload): Promise<AuthSuccess> {
  const parsedPayload = registerPayloadSchema.parse(payload);
  return postValidated("/auth/register", parsedPayload, authSuccessSchema);
}

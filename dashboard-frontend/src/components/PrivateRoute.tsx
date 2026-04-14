import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { getStoredToken } from "../lib/storage";

function PrivateRoute({ children }: PropsWithChildren) {
  const token = getStoredToken();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default PrivateRoute;

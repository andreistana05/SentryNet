import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./styles/index.css";
import App from "./App";
import { queryClient } from "./lib/queryClient";
import { resolveInitialTheme } from "./lib/storage";
import { ThemeProvider } from "./theme/ThemeProvider";

async function enableApiMocking() {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_API_MOCKING === "true") {
    const { worker } = await import("./mocks/browser");
    await worker.start({
      onUnhandledRequest: "bypass",
    });
  }
}

async function bootstrap() {
  await enableApiMocking();
  document.documentElement.dataset.theme = resolveInitialTheme();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();

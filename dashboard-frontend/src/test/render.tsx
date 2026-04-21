/* eslint-disable react-refresh/only-export-components */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../theme/ThemeProvider";

interface RenderWithProvidersOptions {
  route?: string;
}

function Providers({ children, route = "/" }: PropsWithChildren<RenderWithProvidersOptions>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

export function renderWithProviders(ui: ReactElement, options?: RenderWithProvidersOptions) {
  return render(ui, {
    wrapper: ({ children }) => <Providers route={options?.route}>{children}</Providers>,
  });
}

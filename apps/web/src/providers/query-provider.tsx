"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * React Query provider — mikconnect.
 *
 * Defaults calmes :
 *  - retries limitées (1) pour ne pas marteler une API en 3G sur une erreur
 *    définitive (401/403/422).
 *  - staleTime 30s : le dashboard ne se re-fetch pas au moindre
 *    re-mount (on évite le flash de loading sur navigation back).
 *  - refetchOnWindowFocus désactivé : le proprio quitte et revient à
 *    l'app sans recharger inutilement (3G coûteuse).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

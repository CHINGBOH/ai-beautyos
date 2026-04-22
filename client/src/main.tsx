import { trpc } from "@/lib/trpc";
import { getByApiPath, computeHash } from "@shared/api-action-map";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl, isOauthConfigured } from "./const";
import "./index.css";

/** 从 tRPC 请求 URL 解析 procedure 路径（如 content.generate），用于附加 X-Action-Hash */
function getPathFromTrpcUrl(url: string): string | null {
  try {
    const pathname = new URL(url, "http://_").pathname;
    const prefix = "/api/trpc/";
    if (!pathname.startsWith(prefix)) return null;
    const path = pathname.slice(prefix.length).replace(/\/$/, "");
    return path || null;
  } catch {
    return null;
  }
}

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;
  if (!isOauthConfigured()) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        const url =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : input.href;
        const path = getPathFromTrpcUrl(url);
        const hash = path
          ? (getByApiPath(path)?.hash ?? computeHash(path))
          : undefined;
        const headers = new Headers(init?.headers);
        if (hash) headers.set("X-Action-Hash", hash);
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          headers,
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

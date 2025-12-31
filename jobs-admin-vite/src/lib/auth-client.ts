import { createAuthClient } from "better-auth/react";
import { usernameClient, adminClient } from "better-auth/client/plugins";
import { API_CONFIG } from "./config.ts";

export const authClient = createAuthClient({
    baseURL: API_CONFIG.BASE_URL,
    basePath: "/api/auth",
    plugins: [
        usernameClient(),
        adminClient(),
    ],
    fetchOptions: {
        onError(context) {
            console.error("Auth error:", context.error);
        },
    },
    session: {
        fetchOnWindowFocus: false,
        refetchInterval: false,
        refetchOnMount: false,
    },
});

export const { 
    signIn,
    signOut,
    admin,
} = authClient;

import { AuthConfig } from "convex/server";

export default {
    providers: [
        {
            domain: "https://clean-kangaroo-58.clerk.accounts.dev",
            applicationID: "convex",
        },
    ],
} satisfies AuthConfig;
;
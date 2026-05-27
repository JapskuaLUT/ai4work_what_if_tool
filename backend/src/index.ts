// backend/src/index.ts

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { apiRoutes } from "./routes";
import { staticPlugin } from "@elysiajs/static";
import { logger } from "./logging";

const FILE = "index.ts";

const PORT = process.env.PORT || 8000;

// Create and configure the main Elysia app
const app = new Elysia()
    // Global plugins
    .use(cors())
    .use(swagger())
    .use(
        staticPlugin({
            assets: "public",
            prefix: "/"
        })
    )
    // User-uploaded files (yard images today; could expand later).
    // Served at /uploads/* so a stored DB path like
    //   https://backend.localhost/uploads/yard_images/{caseId}.png
    // resolves without going through the API.
    .use(
        staticPlugin({
            assets: "uploads",
            prefix: "/uploads",
            // re-scan filesystem on each request — the upload route writes
            // new files at runtime, plugin's startup directory-walk would
            // otherwise miss them.
            noCache: true,
            alwaysStatic: false
        })
    )

    // Root endpoint
    .get("/", () => "What-If Component API")

    // All API routes under the /api prefix
    .use(apiRoutes)
    .listen(PORT);

logger.info(`Backend server running at ${process.env.SERVER_URL}`, {
    file: FILE
});
logger.info(
    `Backend server running (internally) at ${app.server?.hostname}:${app.server?.port}`
);

// Export the type for use in other parts of the application
export type App = typeof app;

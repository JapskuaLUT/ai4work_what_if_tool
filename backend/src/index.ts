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

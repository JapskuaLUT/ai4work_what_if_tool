// backend/src/routes/index.ts

import Elysia from "elysia";
import { healthRoutes } from "./healthRoutes";
import { metricsRoutes } from "./metricsRoutes";
import { simulationRoutes } from "./simulationRoutes";

// Combine all route modules into a single plugin
export const apiRoutes = new Elysia({ prefix: "/api" })
    .use(healthRoutes)
    .use(metricsRoutes)
    .use(simulationRoutes);

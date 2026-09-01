// backend/src/routes/index.ts

import Elysia from "elysia";
import { healthRoutes } from "./healthRoutes";
import { metricsRoutes } from "./metricsRoutes";
import { simulationRoutes } from "./simulationRoutes";
import { educationalStressRoutes } from "./educationalStressRoutes";
import { educationStressV1Routes } from "./educationStressV1Routes";
import { yardRoutes } from "./yardRoutes";
import { logRoutes } from "./logRoutes";

// Combine all route modules into a single plugin
export const apiRoutes = new Elysia({ prefix: "/api" })
    .use(healthRoutes)
    .use(metricsRoutes)
    .use(simulationRoutes) // Existing coursework simulations at /api/simulations/
    // Registered first so the static /stress-model path is not captured by
    // educationalStressRoutes' /:caseId route.
    .use(educationStressV1Routes) // course_stress_prediction v1.0 endpoints
    .use(educationalStressRoutes) // Educational stress at /api/simulations/education/
    .use(yardRoutes) // Yard logistics at /api/simulations/yard/
    .use(logRoutes); // Kiosk logs at /api/logs/

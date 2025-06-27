// backend/src/routes/healthRoute.ts

import Elysia, { t } from "elysia";

export const healthRoutes = new Elysia().get(
    "/health",
    () => ({
        status: "ok",
        timestamp: new Date().toISOString()
    }),
    {
        detail: {
            tags: ["Health"],
            responses: {
                200: {
                    description: "Service is healthy",
                    content: {
                        "application/json": {
                            schema: t.Object({
                                status: t.Literal("ok"),
                                timestamp: t.String({ format: "date-time" })
                            })
                        }
                    }
                }
            }
        }
    }
);

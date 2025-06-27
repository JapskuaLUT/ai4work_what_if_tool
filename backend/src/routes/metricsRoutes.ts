// backend/src/routes/metricsRoutes.ts

import Elysia, { t } from "elysia";
import { register } from "../metrics";

const FILE = "routes/metricsRoutes.ts";

export const metricsRoutes = new Elysia().get(
    "/metrics",
    async () => {
        return new Response(await register.metrics(), {
            headers: {
                "Content-Type": register.contentType
            }
        });
    },
    {
        detail: {
            tags: ["Metrics"],
            responses: {
                200: {
                    description: "Prometheus metrics",
                    content: {
                        "text/plain": {
                            schema: t.String()
                        }
                    }
                }
            }
        }
    }
);

// backend/src/metrics/index.ts
import client from "prom-client";

// Enable default metrics
client.collectDefaultMetrics();

// Example histogram
export const httpRequestDuration = new client.Histogram({
    name: "http_request_duration_ms",
    help: "Duration of HTTP requests in ms",
    labelNames: ["method", "route", "code"],
    buckets: [50, 100, 200, 300, 400, 500, 1000]
});

export const register = client.register;

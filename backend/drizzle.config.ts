// backend/drizzle.config.ts
//
// Drizzle Kit configuration for database migrations
// This file is used by drizzle-kit CLI commands

import type { Config } from "drizzle-kit";

export default {
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    driver: "pg",
    dbCredentials: {
        connectionString:
            process.env.DATABASE_URL ||
            "postgres://whatifuser:whatifpassword@postgres:5432/whatifdatabase",
    },
} satisfies Config;

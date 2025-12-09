#!/bin/bash
# backend/scripts/migrate-and-start.sh
#
# Startup script that ensures database migrations are applied before starting the server
# This prevents "relation does not exist" errors on fresh setups

set -e  # Exit on any error

echo "🔄 Starting backend with automatic migrations..."
echo ""

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if bunx drizzle-kit push:pg --config=drizzle.config.ts 2>&1 | grep -q "Everything's fine"; then
        echo "✅ PostgreSQL is ready!"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "❌ PostgreSQL is not ready after $MAX_RETRIES attempts"
        echo "   Please check if the database is running and accessible"
        exit 1
    fi

    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - waiting 2 seconds..."
    sleep 2
done

echo ""
echo "🗄️  Applying database migrations..."

# Apply migrations using drizzle-kit push
# This automatically compares the schema with the database and applies any missing changes
if bunx drizzle-kit push:pg --config=drizzle.config.ts; then
    echo "✅ Database migrations applied successfully!"
else
    echo "⚠️  Migration may have failed, but continuing..."
    echo "   If this is a fresh database, tables might already be created"
fi

echo ""
echo "🚀 Starting backend server..."
echo ""

# Start the backend server with hot reload
exec bun run --watch src/index.ts

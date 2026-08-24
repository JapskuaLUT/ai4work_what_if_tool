# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.4.0

# Dependencies live one level above the application directory so the
# docker-compose bind mount over /usr/src/app cannot shadow them with the
# host's macOS-built tree, and the compose files mask /usr/src/app/node_modules
# with a tmpfs. Nothing in the backend needs a native binary today, but keeping
# both services on the same layout means a dependency that grows one will not
# fail only inside Docker. See ui/Dockerfile for the full story.
WORKDIR /usr/src
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

WORKDIR /usr/src/app
COPY . .
CMD ["bun", "run", "dev"]

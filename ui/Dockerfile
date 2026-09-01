# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.4.0

# Dependencies are installed one level ABOVE the application directory, on
# purpose.
#
# docker-compose bind-mounts the host's ./ui over /usr/src/app for live reload.
# That host tree is macOS/arm64, and Vite pulls in rollup, which ships a
# platform-specific native binary (@rollup/rollup-linux-arm64-gnu) as an
# optional dependency. If the container resolves the host's node_modules it
# dies at startup with "Cannot find module @rollup/rollup-linux-arm64-gnu".
#
# Installing here, at /usr/src/node_modules, puts the dependency tree somewhere
# the bind mount cannot reach; Bun walks up from /usr/src/app and finds it.
# The compose files pair this with a tmpfs over /usr/src/app/node_modules so
# the host tree is hidden rather than merely outranked — see the comment there
# for why a tmpfs and not an anonymous volume.
WORKDIR /usr/src
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

WORKDIR /usr/src/app
COPY . .
CMD ["bun", "dev"]

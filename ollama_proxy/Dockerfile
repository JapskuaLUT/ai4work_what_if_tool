# Pinned to the same nginx version the compose files use for the front proxy,
# so the two nginx builds in this project cannot drift apart.
FROM nginx:1.29.3-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf

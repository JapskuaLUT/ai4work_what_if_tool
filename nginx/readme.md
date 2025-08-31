# Nginx Proxy Configuration for What-If Tool

This directory contains the nginx configuration that replaces the original Traefik setup for the What-If Tool project.

## Overview

This nginx configuration provides:

-   SSL termination with automatic HTTP to HTTPS redirection
-   Reverse proxy routing for all services
-   WebSocket support for UI and Ollama services
-   Proper header forwarding for client IP and protocol information

## Services Proxied

| Hostname             | Service      | Port | Purpose                                        |
| -------------------- | ------------ | ---- | ---------------------------------------------- |
| `app.localhost`      | UI Frontend  | 5173 | React/Vite development server                  |
| `backend.localhost`  | Backend API  | 8000 | Bun/TypeScript API server                      |
| `ollama.localhost`   | Ollama Proxy | 80   | Ollama AI model API proxy                      |
| `postgres.localhost` | PostgreSQL   | 5432 | Database (though HTTP proxy for DB is unusual) |

## Configuration Details

### SSL Setup

-   Uses certificates from `../traefik/certs/`
-   TLS 1.2/1.3 with modern cipher suites
-   Automatic HTTP to HTTPS redirection

### Service Discovery

-   Uses Docker's internal DNS resolution
-   Services are accessed via service names (ui, backend, postgres, ollama-proxy)
-   Explicit port numbers specified for each service

### Headers Forwarded

-   `Host`: Original host header
-   `X-Real-IP`: Client IP address
-   `X-Forwarded-For`: Client IP chain
-   `X-Forwarded-Proto`: Original protocol (http/https)

### WebSocket Support

-   Enabled for UI (Vite dev server) and Ollama services
-   Uses HTTP/1.1 with Upgrade header handling

## Usage

### Starting Services

```bash
# Use the nginx compose file instead of the default
docker-compose -f docker-compose-nginx.yml up -d
```

### Testing Configuration

```bash
# Test nginx configuration syntax
docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx:1.25-alpine nginx -t

# Test service accessibility
curl -k https://app.localhost
curl -k https://backend.localhost/api/health
curl -k https://ollama.localhost/api/tags
```

### Stopping Services

```bash
docker-compose -f docker-compose-nginx.yml down
```

## File Structure

```
nginx/
├── nginx.conf      # Main nginx configuration
├── readme.md       # This documentation
└── (certs are mounted from ../traefik/certs/)
```

## Differences from Traefik

### Advantages:

-   **Simplicity**: Static configuration is easier to understand
-   **Performance**: Nginx is known for high performance
-   **Maturity**: Battle-tested in production environments
-   **Control**: Fine-grained control over routing and headers

### Disadvantages:

-   **Manual Configuration**: No automatic service discovery
-   **Static Updates**: Need to restart nginx for configuration changes
-   **No Dashboard**: No built-in web interface like Traefik

## Troubleshooting

1. **Certificate Issues**: Ensure `../traefik/certs/` contains valid certificates
2. **Service Resolution**: Verify all services are running on the same Docker network
3. **Port Conflicts**: Check that ports 80 and 443 are available on the host
4. **Configuration Errors**: Use `nginx -t` to validate configuration syntax

## Migration Notes

This configuration maintains the same hostnames and functionality as the original Traefik setup, making it a drop-in replacement. All environment variables and service URLs remain unchanged.

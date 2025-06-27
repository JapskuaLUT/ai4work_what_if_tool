# Ollama Proxy

This directory contains the configuration and Docker setup for an Nginx proxy service. Its primary purpose is to expose a locally running Ollama server (typically on `http://localhost:11434`) to other Dockerized services within the same Docker network, particularly those that require HTTPS communication.

## Purpose

In a development environment where you have Dockerized applications (e.g., a frontend or backend service) that need to interact with a local Ollama instance, direct access can be problematic due to network isolation and HTTPS requirements. This Nginx proxy solves this by:

-   **Bridging Docker Network to Host:** It allows Docker containers to access the host machine's Ollama server via `http://host.docker.internal:11434`.
-   **Consistent Endpoint:** Provides a stable internal endpoint (`http://ollama.localhost`) for other Docker services to connect to, abstracting away the host-specific address.
-   **CORS Handling:** Configured to handle Cross-Origin Resource Sharing (CORS) preflight requests, ensuring seamless communication from web applications.

## Configuration

The proxy's behavior is defined in `nginx.conf`:

```nginx
server {
    listen 80;
    server_name ollama.localhost;

    location / {
        # Handle preflight OPTIONS requests for CORS
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
            add_header 'Access-Control-Allow-Headers' '*' always;
            add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        # Proxy requests to the host's Ollama server
        proxy_pass http://host.docker.internal:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
```

-   **`listen 80;`**: Nginx listens on port 80 within the Docker container.
-   **`server_name ollama.localhost;`**: This defines the server block for requests targeting `ollama.localhost`.
-   **CORS Headers**: The `if ($request_method = 'OPTIONS')` block ensures that preflight CORS requests are handled correctly, allowing cross-origin communication.
-   **`proxy_pass http://host.docker.internal:11434;`**: This is the core of the proxy. It forwards all incoming requests to the Ollama server running on the host machine at port `11434`. `host.docker.internal` is a special DNS name that resolves to the internal IP address of the host from within a Docker container.
-   **`proxy_set_header`**: These directives ensure that original request headers (like Host, IP, and protocol) are correctly passed to the Ollama server, which can be important for logging and routing.

## Docker Setup

The `Dockerfile` is straightforward:

```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

This Dockerfile:

1.  Uses the lightweight `nginx:alpine` base image.
2.  Copies the custom `nginx.conf` into the Nginx configuration directory, replacing the default Nginx configuration.

## Usage

To integrate this Ollama proxy into your Docker Compose setup:

1.  Ensure your local Ollama server is running on `http://localhost:11434`.
2.  Add a service definition for `ollama_proxy` in your `docker-compose.yml` file, similar to this:

    ```yaml
    services:
        ollama_proxy:
            build: ./ollama_proxy
            container_name: ollama_proxy
            ports:
                - "80:80" # Expose port 80 if you need to access it directly from host, otherwise remove
            networks:
                - your_docker_network # Ensure this is the same network as your other services
            extra_hosts:
                - "host.docker.internal:host-gateway" # Required for Docker Desktop on some OSes to resolve host.docker.internal
    ```

    _Note: The `ports` mapping might not be necessary if this service is only accessed internally by other Docker containers._

3.  In your other Dockerized services (e.g., frontend or backend), configure them to use `http://ollama.localhost` as the endpoint for the Ollama server. For example, in a Node.js application, your environment variable might look like: `OLLAMA_API_URL=http://ollama.localhost`.

This setup allows your Dockerized applications to seamlessly communicate with your local Ollama instance through a consistent and reliable proxy.

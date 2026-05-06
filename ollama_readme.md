# Running Ollama locally for the AI features

The What-If Tool's AI features (model dropdown, scenario explanations,
chat) call your **host machine's** Ollama through the dockerised
`ollama-proxy` service. The proxy forwards `https://ollama.localhost` →
`http://host.docker.internal:11434`, so Ollama has to be running on the
host **before** the dockerised app can use it.

## Start Ollama with the right env vars (macOS / Linux)

```sh
OLLAMA_HOST=0.0.0.0 \
OLLAMA_ORIGINS='https://app.localhost,https://backend.localhost' \
ollama serve
```

Why each variable matters:

-   **`OLLAMA_HOST=0.0.0.0`** — bind on all interfaces. Without this,
    Ollama listens only on `127.0.0.1` and the proxy container can't
    reach it across the Docker host gateway → the UI sees `502 Bad
    Gateway`.
-   **`OLLAMA_ORIGINS=…`** — Ollama itself adds the
    `Access-Control-Allow-Origin` header for the listed origins. Without
    this the browser blocks the response with a CORS error even though
    Ollama responded successfully.

Keep that terminal open while you develop, or background it with
`nohup`:

```sh
nohup env OLLAMA_HOST=0.0.0.0 \
    OLLAMA_ORIGINS='https://app.localhost,https://backend.localhost' \
    ollama serve > /tmp/ollama.log 2>&1 &
```

## Verify before opening the UI

```sh
# 1. Ollama is listening
lsof -iTCP:11434 -sTCP:LISTEN

# 2. Direct call works on the host
curl -sS http://localhost:11434/api/tags | head -c 200

# 3. Proxy + CORS work (mimics the browser)
curl -ksS -H 'Origin: https://app.localhost' \
    https://ollama.localhost/api/tags -o /dev/null -w 'HTTP %{http_code}\n'
```

You want, in order: a process listening, a JSON `models` array, and
`HTTP 200`. If step 3 prints `502`, jump to **Troubleshooting** below.

## Troubleshooting: 502 Bad Gateway + CORS error in the browser

The browser console looks like:

> Access to fetch at `https://ollama.localhost/api/tags` from origin
> `https://app.localhost` has been blocked by CORS policy: No
> `Access-Control-Allow-Origin` header is present on the requested
> resource.
>
> GET https://ollama.localhost/api/tags 502 (Bad Gateway)

The CORS message is a **red herring**: when nginx returns 502 it skips
the upstream-success path, so the CORS header that Ollama would
normally add is missing. Fix the upstream and the CORS error disappears
on its own.

Almost always one of:

1. **Ollama isn't running on the host.** `lsof -iTCP:11434` returns
    nothing. Start it with the env vars above.
2. **Ollama is running but bound to `127.0.0.1` only.** Started with
    `ollama serve` *without* `OLLAMA_HOST=0.0.0.0`. The proxy logs
    show `connect() failed (111: Connection refused)` to the host
    gateway IP. Restart Ollama with `OLLAMA_HOST=0.0.0.0`.
3. **Wrong `OLLAMA_ORIGINS`.** Ollama returns 200 but no CORS header
    for your origin. Confirm with `curl -i -H 'Origin: ...' ...` and
    restart with the correct origins list.

Tail the proxy when in doubt:

```sh
docker-compose logs --tail=50 ollama-proxy
```

## Keeping it persistent across reboots (macOS)

A simple LaunchAgent restarts Ollama automatically. Create
`~/Library/LaunchAgents/com.ollama.serve.plist` with the env vars set
on the `EnvironmentVariables` key, then:

```sh
launchctl load ~/Library/LaunchAgents/com.ollama.serve.plist
```

If you don't want LaunchAgents, just remember to run the `ollama serve`
command in a terminal after each reboot — `docker-compose up` alone is
not enough; the AI features need the host process too.

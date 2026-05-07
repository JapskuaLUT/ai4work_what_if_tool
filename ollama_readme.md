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

## Troubleshooting: "CORS error" in the browser

If the browser console says:

> Access to fetch at `https://ollama.localhost/api/...` from origin
> `https://app.localhost` has been blocked by CORS policy: No
> `Access-Control-Allow-Origin` header is present on the requested
> resource.

…the CORS message is **almost always a red herring**. When nginx
returns a 4xx/5xx page it doesn't include the CORS headers that Ollama
would have set on a successful response, so the browser blames CORS for
what is really a connectivity or upstream problem.

### Step 1 — find the real error

**Always check the proxy log first.** It prints the real status code
and the real upstream failure on every request:

```sh
docker-compose logs --tail=50 ollama-proxy
```

You'll see one of: `502`, `504`, `200` (with no CORS header), or a
`connect() failed` error. Match the result to the table below.

### Step 2 — match the symptom

Ranked by how often we've actually hit each one:

| # | Symptom (proxy log)                                         | Cause                                                                                                | Fix                                                                                                              |
|:-:|:------------------------------------------------------------|:------------------------------------------------------------------------------------------------------|:------------------------------------------------------------------------------------------------------------------|
| 1 | `502` + `connect() failed (111: Connection refused)`        | Ollama isn't running on the host (or is bound to `127.0.0.1` only — same symptom from the container's POV). | `lsof -iTCP:11434 -sTCP:LISTEN` — if empty or shows `127.0.0.1` only, restart Ollama with `OLLAMA_HOST=0.0.0.0`.   |
| 2 | `504` + `upstream timed out (110)` after 600s/1200s         | Slow / stuck model inference. Reasoning models (qwen3.5, gpt-oss with thinking) on a long prompt can hang past the proxy's read timeout.   | Use a non-reasoning model (`phi4:latest`) for proposal generation; ensure `num_predict` is capped in the request. |
| 3 | `200` returned but no `Access-Control-Allow-Origin` header  | Wrong `OLLAMA_ORIGINS` — Ollama didn't recognise the request origin.                                  | Restart Ollama with `OLLAMA_ORIGINS='https://app.localhost,https://backend.localhost'`.                            |
| 4 | `404` / route mismatch                                      | Asking for a path Ollama doesn't expose, or pointing the UI at the wrong proxy host.                  | Compare the failing URL against `/api/tags`, `/api/chat`, `/api/generate`, `/api/ps` — those are the real ones.    |

### Step 3 — verify with curl

After applying a fix, confirm with:

```sh
# Direct host call
curl -sS --max-time 5 http://localhost:11434/api/tags -o /dev/null -w 'host HTTP %{http_code}\n'

# Through the proxy with the browser's origin
curl -ksS --max-time 5 -H 'Origin: https://app.localhost' \
    https://ollama.localhost/api/tags -D /tmp/h.txt -o /dev/null -w 'proxy HTTP %{http_code}\n'
grep -i 'access-control-allow-origin' /tmp/h.txt
```

Expect `host HTTP 200`, `proxy HTTP 200`, and a header line
`access-control-allow-origin: https://app.localhost`. Anything else and
you're back at Step 2.

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

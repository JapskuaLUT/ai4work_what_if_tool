# When running ollama locally in dev

You need to allow origins for ollama, in order for your dockerized application to talk to it.
In OSX, you can do this by running:
`OLLAMA_HOST=0.0.0.0 OLLAMA_ORIGINS='https://app.localhost,https://backend.localhost' ollama serve`

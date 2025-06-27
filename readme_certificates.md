# How to install trusted certificates on your machine?

Read more about [mkcert](https://github.com/FiloSottile/mkcert).

## Step 1: Install mkcert

### Mac (Homebrew)

```sh
brew install mkcert
brew install nss # (for Firefox support)
```

### Windows (Chocolatey)

```sh
choco install mkcert
```

### Windows (Scoop)

```sh
scoop install mkcert
```

## Linux

### For Ubuntu/Debian:

```sh
sudo apt install libnss3-tools
curl -fsSL https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-$(uname -s)-$(uname -m) -o mkcert
chmod +x mkcert
sudo mv mkcert /usr/local/bin/
```

### For Arch Linux:

```sh
sudo pacman -S mkcert
```

## Step 2: Set Up a Local Certificate Authority (CA)

Run this command once to create a local CA:

```sh
mkcert -install
```

    •	This installs a trusted root CA on your system automatically.
    •	No need to manually add certificates to the system.

## Step 3: Generate a Wildcard Certificate for \*.localhost

Now, create a wildcard certificate:

```sh
mkcert "*.localhost" traefik.localhost ollama.localhost app.localhost backend.localhost postgres.localhost
```

This will generate:
• _.localhost.pem (certificate)
• _.localhost-key.pem (private key)

## Step 4: Use the Certificate in Your Server

### Traefik

Move these files to a directory that Traefik can access.
If your wildcard has a different name, change it accordingly.

```sh
mkdir -p traefik/certs
mv _wildcard.localhost+5.pem traefik/certs/cert.pem
mv _wildcard.localhost+5-key.pem traefik/certs/key.pem
```

Give read access to the certificate and key files:

```sh
chmod 600 traefik/certs/*
```

### Nginx

```sh
server {
    listen 443 ssl;
    server_name \*.localhost;

    ssl_certificate /path/to/_wildcard.localhost.pem;
    ssl_certificate_key /path/to/_wildcard.localhost-key.pem;
}
```

### Node.js (Express)

```javascript
const https = require("https");
const fs = require("fs");
const express = require("express");

const app = express();

const options = {
    key: fs.readFileSync("./_wildcard.localhost-key.pem"),
    cert: fs.readFileSync("./_wildcard.localhost.pem")
};

https.createServer(options, app).listen(443, () => {
    console.log("Secure server running on https://*.localhost");
});
```

## Step 5: Restart Browser and Enjoy

• Restart Chrome/Edge/Firefox.
• Open https://yourservice.localhost and there should be no certificate errors.

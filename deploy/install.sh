#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
APP_DIR=/opt/myboke
REPO=https://github.com/ESNyarobi123/myboke.git

echo "==> Installing Docker + Caddy"
apt-get update -y
apt-get install -y ca-certificates curl gnupg debian-keyring debian-archive-keyring apt-transport-https

# Docker
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

# Caddy
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> Fetching project"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --all --prune
  git -C "$APP_DIR" reset --hard origin/main
else
  rm -rf "$APP_DIR"
  git clone "$REPO" "$APP_DIR"
fi

cd "$APP_DIR/deploy"

if [ ! -f .env ]; then
  echo "==> Creating production .env"
  PG_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
  cat > .env <<ENV
POSTGRES_PASSWORD=${PG_PASS}
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
PUBLIC_API_URL=https://apiboke.yunigo.online
CORS_ORIGINS=https://myboke.yunigo.online,https://apiboke.yunigo.online
NODE_ENV=production
PORT=4000
API_PREFIX=v1
APP_NAME=MyBoke
ENV
  chmod 600 .env
fi

echo "==> Starting containers"
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Configuring Caddy"
cp "$APP_DIR/deploy/Caddyfile" /etc/caddy/Caddyfile
systemctl enable --now caddy
systemctl reload caddy || systemctl restart caddy

echo "==> Waiting for API health"
for i in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:4000/v1/health >/dev/null 2>&1; then
    echo "API is healthy"
    break
  fi
  sleep 3
done

curl -fsS http://127.0.0.1:4000/v1/health || true
echo
echo "DONE"
echo "Web: https://myboke.yunigo.online"
echo "API: https://apiboke.yunigo.online/v1"

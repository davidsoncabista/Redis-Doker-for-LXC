#!/bin/bash

echo "🌐 INSTALANDO NGINX PROXY MANAGER (GATEWAY)..."

# 1. Preparação
apt update && apt upgrade -y
apt install curl wget ufw -y

# 2. Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
fi

# 3. Firewall (Portas Web)
# O Nginx precisa das portas 80 (HTTP) e 443 (HTTPS) abertas para o mundo
# E a porta 81 para o painel de administração (só local)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow from 192.168.0.0/24 to any port 81 
echo "y" | ufw enable

# 4. Docker Compose
mkdir -p nginx-proxy
cd nginx-proxy

cat <<EOF > docker-compose.yml
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    container_name: nginx_gateway
    restart: unless-stopped
    ports:
      - '80:80'   # Porta HTTP Pública
      - '81:81'   # Painel Admin (Interno)
      - '443:443' # Porta HTTPS Pública
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt

networks:
  default:
    driver: bridge
EOF

# 5. Iniciar
docker compose up -d

echo ""
echo "✅ GATEWAY ONLINE!"
echo "🖥️  Acesse o Painel Admin: http://192.168.0.54:81"
echo "📧 Email Padrão: admin@example.com"
echo "🔑 Senha Padrão: changeme"
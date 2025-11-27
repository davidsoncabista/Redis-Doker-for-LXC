#!/bin/bash

# --- CONFIGURAÇÕES BACKEND TRIPSHARE ---
NODE_VERSION="20" # Versão LTS atual (Iron)
REDE_LOCAL="192.168.0.0/24"
APP_DIR="/var/www/tripshare-api"

echo "🚀 PREPARANDO AMBIENTE NODE.JS PARA O TRIPSHARE..."

# 1. HARDENING BÁSICO
echo "--- 1/5: Limpando sistema..."
apt update && apt upgrade -y
apt purge postfix exim4 rpcbind -y
apt autoremove -y

# 2. INSTALANDO FERRAMENTAS BASE
echo "--- 2/5: Instalando Git, Curl e Compiladores..."
apt install curl git build-essential ufw -y

# 3. INSTALANDO NODE.JS (Via NodeSource)
echo "--- 3/5: Instalando Node.js v$NODE_VERSION..."
curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash -
apt install -y nodejs

# Instala o PM2 (Gerenciador de Processos que mantém o app online)
npm install -g pm2

# 4. CONFIGURANDO FIREWALL
echo "--- 4/5: Configurando Firewall (Porta 3000)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
# Libera a API (Porta 3000) apenas para a rede local (por enquanto)
# Depois o Nginx (Container 7) vai acessar aqui
ufw allow from $REDE_LOCAL to any port 3000
echo "y" | ufw enable

# 5. ESTRUTURA DE PASTAS
echo "--- 5/5: Criando pasta do projeto..."
mkdir -p $APP_DIR
chown -R $USER:$USER $APP_DIR
# Configura o PM2 para iniciar com o sistema
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root

echo ""
echo "✅ AMBIENTE NODE.JS PRONTO!"
echo "📦 Versão Node: $(node -v)"
echo "📦 Versão NPM: $(npm -v)"
echo "📂 Pasta do Projeto: $APP_DIR"
echo "👉 Agora você pode clonar seu repositório git dentro dessa pasta."
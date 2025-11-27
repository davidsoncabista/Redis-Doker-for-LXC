#!/bin/bash

# --- CONFIGURAÇÕES DO TRIPSHARE ---
# Defina aqui a senha final que o Backend vai usar para conectar
REDIS_SENHA="SenhaForteTripShare2025" 
# Sua rede local (para o firewall liberar acesso apenas para seus servidores)
REDE_LOCAL="192.168.0.0/24"
PASTA_APP="tripshare-redis"

echo "🚀 INICIANDO INSTALAÇÃO AUTOMATIZADA DO REDIS..."

# 1. ATUALIZAÇÃO E LIMPEZA (HARDENING)
echo "--- 1/6: Atualizando sistema e removendo lixo..."
apt update && apt upgrade -y
# Remove serviços de email/rpc que não precisamos e abrem brechas
apt purge postfix exim4 rpcbind -y 
apt autoremove -y
apt clean

# 2. INSTALAÇÃO DO DOCKER E UTILITÁRIOS
echo "--- 2/6: Instalando Docker e ferramentas..."
apt install curl wget ufw nano -y
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. CONFIGURAÇÃO DE FIREWALL (SEGURANÇA)
echo "--- 3/6: Configurando Firewall (UFW)..."
ufw default deny incoming  # Bloqueia tudo que entra
ufw default allow outgoing # Libera tudo que sai
ufw allow 22/tcp           # Permite SSH (Admin)
# Permite conexão na porta 6379 SOMENTE vinda da rede local (Backend/Admin)
ufw allow from $REDE_LOCAL to any port 6379 
echo "y" | ufw enable      # Ativa o firewall

# 4. OTIMIZAÇÃO DO KERNEL (PERFORMANCE REDIS)
echo "--- 4/6: Ajustando Kernel (Overcommit Memory)..."
# Evita lentidão e erros de memória no Redis sob carga alta
if ! grep -q "vm.overcommit_memory = 1" /etc/sysctl.conf; then
    echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf
    sysctl -p
fi

# 5. CRIANDO O DOCKER-COMPOSE (SERVIÇO)
echo "--- 5/6: Criando arquivo Docker Compose..."
mkdir -p $PASTA_APP
cd $PASTA_APP

cat <<EOF > docker-compose.yml
services:
  redis:
    image: redis:alpine
    container_name: redis_tripshare
    restart: always
    # Comandos: Salvar disco a cada 60s se mudar 1 chave + Senha obrigatória
    command: redis-server --save 60 1 --loglevel warning --requirepass "$REDIS_SENHA"
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app_network
    # Limitação de Logs (Para não estourar o disco do servidor)
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  redis_data:

networks:
  app_network:
    driver: bridge
EOF

# 6. INICIANDO
echo "--- 6/6: Subindo o container..."
docker compose up -d

echo ""
echo "✅ INSTALAÇÃO CONCLUÍDA!"
echo "📡 IP do Servidor: $(hostname -I)"
echo "🔑 Senha do Redis: $REDIS_SENHA"
echo "🛡️ Status do Firewall:"
ufw status | grep 6379
echo "📦 Status do Container:"
docker ps

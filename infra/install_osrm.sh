#!/bin/bash



# --- CONFIGURAÇÕES TRIPSHARE (MAPAS) ---

# Região: Norte do Brasil (Ideal para Belém/PA)

# Fonte: Geofabrik

MAP_URL="https://download.geofabrik.de/south-america/brazil/norte-latest.osm.pbf"

MAP_FILE="norte-latest.osm.pbf"

APP_DIR="tripshare-osrm"

REDE_LOCAL="192.168.0.0/24"



echo "🗺️ INICIANDO INSTALAÇÃO DO SERVIDOR DE ROTAS (OSRM)..."



# 1. PREPARAÇÃO DO SISTEMA

echo "--- 1/5: Limpando e preparando sistema..."

apt update && apt upgrade -y

apt install curl wget ufw -y

apt autoremove -y



# 2. INSTALAÇÃO DOCKER

echo "--- 2/5: Instalando Docker..."

if ! command -v docker &> /dev/null; then

    curl -fsSL https://get.docker.com -o get-docker.sh

    sh get-docker.sh

fi



# 3. FIREWALL

echo "--- 3/5: Configurando Firewall (Porta 5000)..."

ufw default deny incoming

ufw default allow outgoing

ufw allow 22/tcp

# Libera API de Rotas apenas para rede local (Backend acessar)

ufw allow from $REDE_LOCAL to any port 5000

echo "y" | ufw enable



# 4. DOWNLOAD E PROCESSAMENTO DO MAPA (A PARTE PESADA)

echo "--- 4/5: Baixando e Processando o Mapa (Isso pode demorar)..."

mkdir -p $APP_DIR

cd $APP_DIR



if [ ! -f "$MAP_FILE" ]; then

    echo "📥 Baixando mapa da Região Norte..."

    wget $MAP_URL -O $MAP_FILE

fi



echo "⚙️ Processando Grafo de Rotas (Profile: Car)..."

# Passo A: Extrair dados do PBF

docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/$MAP_FILE

# Passo B: Otimizar Grafo (Contraction Hierarchies - Mais rápido para apps)

docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-contract /data/$MAP_FILE.osrm



# 5. CRIANDO SERVIÇO (DOCKER COMPOSE)

echo "--- 5/5: Criando serviço final..."

cat <<EOF > docker-compose.yml

services:

  osrm:

    image: osrm/osrm-backend

    container_name: osrm_tripshare

    restart: always

    ports:

      - "5000:5000"

    volumes:

      - .:/data

    # Inicia o servidor usando o algoritmo CH (Alta performance)

    command: osrm-routed --algorithm ch /data/$MAP_FILE.osrm

    networks:

      - app_network

    logging:

      driver: "json-file"

      options:

        max-size: "10m"

        max-file: "3"



networks:

  app_network:

    driver: bridge

EOF



# INICIAR

docker compose up -d



echo ""

echo "✅ SERVIDOR DE ROTAS OPERACIONAL!"

echo "📡 Teste no navegador: http://$(hostname -I | awk '{print $1}'):5000/route/v1/driving/-48.48,-1.45;-48.46,-1.44?overview=false"
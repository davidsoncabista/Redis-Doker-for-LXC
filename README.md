# 🚀 TripShare Infra: Redis Microservice Automation

Script de provisionamento automatizado ("Infrastructure as Code") para configurar o microsserviço de Cache e Geolocalização em Tempo Real do projeto **TripShare**.

Este script transforma um container Linux limpo (LXC/Proxmox) em um servidor Redis de produção, aplicando as melhores práticas de segurança e performance.

## 🛡️ Funcionalidades e Hardening

Este script não apenas instala o Docker, mas prepara todo o ambiente:

* **Limpeza do Sistema:** Remove serviços desnecessários (bloatware) do template Linux para reduzir a superfície de ataque.
* **Firewall (UFW):** Configura "Deny All" por padrão e libera a porta `6379` **apenas** para a rede interna (`192.168.0.0/24`), protegendo o banco contra acessos externos.
* **Kernel Tuning:** Aplica `vm.overcommit_memory = 1` automaticamente para evitar erros de alocação de memória sob alta carga.
* **Docker Security:** Configura o container com persistência de dados (AOF/RDB) e define senha forte obrigatória (`--requirepass`).
* **Log Rotation:** Configura o Docker para limitar o tamanho dos logs (Max 30MB), prevenindo o enchimento do disco.

## 📋 Pré-requisitos

* Container LXC (Proxmox) com Debian 12 ou Ubuntu 22.04.
* Opção **"Nesting"** habilitada nas configurações do Container.
* Recursos mínimos: 1 Core, 512MB RAM.

## 🚀 Como Usar

1. Acesse o terminal do seu container LXC.
2. Baixe o script `install_redis.sh` deste repositório.
3. Dê permissão de execução e rode:

```bash
chmod +x install_redis.sh
./install_redis.sh

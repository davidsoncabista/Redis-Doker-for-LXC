-- =========================================================
-- ESTRUTURA DO BANCO DE DADOS TRIPSHARE (PostgreSQL + PostGIS)
-- =========================================================

-- 1. Tabela de Usuários (Genérica para Passageiro e Motoboy)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL, -- Vamos guardar a senha criptografada aqui
    telefone VARCHAR(20),
    tipo VARCHAR(20) CHECK (tipo IN ('passageiro', 'motorista', 'admin')),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela Específica para Motoboys (Vinculada ao Usuário)
CREATE TABLE perfil_motorista (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    placa_moto VARCHAR(10) NOT NULL,
    modelo_moto VARCHAR(50),
    cor_moto VARCHAR(20),
    status VARCHAR(20) DEFAULT 'offline', -- online, offline, ocupado
    posicao_atual GEOMETRY(Point, 4326),  -- A localização GPS atual do motoboy
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Corridas (Histórico e Ativas)
CREATE TABLE corridas (
    id SERIAL PRIMARY KEY,
    id_passageiro INT REFERENCES usuarios(id),
    id_motorista INT REFERENCES usuarios(id), -- Pode ser NULL no início (ninguém aceitou ainda)
    
    -- Dados Geográficos (Origem e Destino)
    origem_texto VARCHAR(255),
    destino_texto VARCHAR(255),
    origem_geom GEOMETRY(Point, 4326),
    destino_geom GEOMETRY(Point, 4326),
    
    -- Dados Financeiros (Calculados pela sua API)
    distancia_km DECIMAL(10,2),
    tempo_minutos DECIMAL(10,2),
    valor_total DECIMAL(10,2),
    
    -- Controle de Estado
    status VARCHAR(20) DEFAULT 'pendente', -- pendente, aceita, em_andamento, finalizada, cancelada
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalizado_em TIMESTAMP
);

-- 4. Índices Espaciais (Para o PostGIS buscar motoboys próximos rápido)
CREATE INDEX idx_motorista_posicao ON perfil_motorista USING GIST (posicao_atual);
CREATE INDEX idx_corridas_origem ON corridas USING GIST (origem_geom);

-- =========================================================
-- DADOS DE TESTE (SEEDS) - Para você não começar vazio
-- =========================================================

-- Criar um Passageiro (João)
INSERT INTO usuarios (nome, email, senha_hash, telefone, tipo) 
VALUES ('João Passageiro', 'joao@email.com', 'senha123', '91999999999', 'passageiro');

-- Criar um Motoboy (Pedro)
INSERT INTO usuarios (nome, email, senha_hash, telefone, tipo) 
VALUES ('Pedro Motoboy', 'pedro@email.com', 'senha123', '91888888888', 'motorista');

-- Criar o Perfil da Moto do Pedro
INSERT INTO perfil_motorista (usuario_id, placa_moto, modelo_moto, cor_moto, status, posicao_atual)
VALUES (
    (SELECT id FROM usuarios WHERE email='pedro@email.com'), 
    'OTX-1234', 'Honda CG 160', 'Vermelha', 'online',
    ST_SetSRID(ST_MakePoint(-48.4806, -1.4500), 4326) -- Pedro está no centro de Belém
);
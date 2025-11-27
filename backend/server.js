require('dotenv').config(); //  Carrega as variáveis
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const { createClient } = require('redis');

// --- CONFIGURAÇÕES ---
const PORTA_API = process.env.PORT || 3000;
const PRECO_BASE = 4.00;
const PRECO_POR_KM = 1.60;
const PRECO_POR_MIN = 0.30;

// Configurações via Variáveis de Ambiente (.env)
const OSRM_URL_BASE = process.env.OSRM_URL;

const DB_CONFIG = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME, 
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
};

// --- APP ---
const app = express();
app.use(cors());
app.use(express.json());

// Conexões
const pool = new Pool(DB_CONFIG);

// Redis Client
const redisClient = createClient({ url: process.env.REDIS_URL });

(async () => {
    try {
        await redisClient.connect();
        console.log("✅ Redis Conectado via Variável de Ambiente");
    } catch (e) {
        console.error("❌ Erro Redis:", e.message);
    }
})();

// --- ROTAS ---
app.get('/', (req, res) => res.json({ status: 'TripShare API Online', mode: 'Secure Env' }));

app.post('/api/simular-corrida', async (req, res) => {
    const { origem, destino } = req.body; 

    if (!origem || !destino) return res.status(400).json({ erro: 'Dados incompletos' });

    try {
        // Consulta OSRM usando a URL do .env
        const urlOSRM = `${OSRM_URL_BASE}/${origem};${destino}?overview=false`;
        const response = await axios.get(urlOSRM);
        
        if (response.data.code !== 'Ok') throw new Error('Erro na rota');

        const rota = response.data.routes[0];
        const km = rota.distance / 1000;
        const min = rota.duration / 60;

        let preco = PRECO_BASE + (km * PRECO_POR_KM) + (min * PRECO_POR_MIN);
        preco = parseFloat(preco.toFixed(2));

        res.json({
            sucesso: true,
            detalhes: { distancia: `${km.toFixed(1)} km`, tempo: `${min.toFixed(0)} min` },
            financeiro: { preco_total: preco }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno' });
    }
    
});
// ========================================================
// NOVA ROTA: SOLICITAR CORRIDA REAL (Grava no Banco)
// ========================================================
app.post('/api/solicitar-corrida', async (req, res) => {
    const { id_passageiro, origem, destino } = req.body;

    // Validação básica
    if (!id_passageiro || !origem || !destino) {
        return res.status(400).json({ erro: 'Faltam dados (id_passageiro, origem, destino)' });
    }

    try {
        console.log(`📝 Nova solicitação de corrida: Passageiro ${id_passageiro}`);

        // 1. Calcular a Rota no OSRM (Igual na simulação)
        // Nota: Se você já migrou para .env, use process.env.OSRM_URL
        const urlOSRM = `${OSRM_URL_BASE}/${origem};${destino}?overview=false`;
        const response = await axios.get(urlOSRM);
        
        if (response.data.code !== 'Ok') throw new Error('Erro ao calcular rota no OSRM');

        const rota = response.data.routes[0];
        const km = rota.distance / 1000;
        const min = rota.duration / 60;
        
        // 2. Calcular Preço Final
        let preco = PRECO_BASE + (km * PRECO_POR_KM) + (min * PRECO_POR_MIN);
        preco = parseFloat(preco.toFixed(2));

        // 3. GRAVAR NO BANCO DE DADOS (PostgreSQL) 💾
        // Aqui usamos a geometria do PostGIS (ST_SetSRID) para salvar o GPS correto
        const query = `
            INSERT INTO corridas (
                id_passageiro, 
                origem_texto, destino_texto, 
                distancia_km, tempo_minutos, valor_total,
                origem_geom, destino_geom,
                status
            ) VALUES (
                $1, 
                'Origem GPS', 'Destino GPS', -- Futuro: Usar geocoding para pegar nome da rua
                $2, $3, $4,
                ST_SetSRID(ST_MakePoint($5, $6), 4326), -- Origem Geom
                ST_SetSRID(ST_MakePoint($7, $8), 4326), -- Destino Geom
                'pendente'
            ) RETURNING id, criado_em;
        `;

        // Extrair Lat/Lon das strings "-48.48,-1.45"
        const [lonOrig, latOrig] = origem.split(',');
        const [lonDest, latDest] = destino.split(',');

        const values = [id_passageiro, km, min, preco, lonOrig, latOrig, lonDest, latDest];

        const dbRes = await pool.query(query, values);
        const novaCorrida = dbRes.rows[0];

        console.log(`✅ Corrida #${novaCorrida.id} salva no banco!`);

        // 4. Retornar sucesso
        res.json({
            sucesso: true,
            mensagem: "Corrida solicitada com sucesso!",
            id_corrida: novaCorrida.id,
            valor: preco,
            status: "pendente" // O app do motoboy vai ficar ouvindo esse status
        });

    } catch (error) {
        console.error("Erro ao solicitar corrida:", error.message);
        res.status(500).json({ erro: 'Erro interno ao salvar corrida' });
    }
});

app.listen(PORTA_API, () => console.log(`🚀 API rodando na porta ${PORTA_API}`));
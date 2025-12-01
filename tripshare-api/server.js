require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const { createClient } = require('redis');

// --- NOVIDADE 1: Importar HTTP e Socket.io ---
const http = require('http');
const { Server } = require("socket.io");

// --- CONFIGURACOES ---
const PORTA_API = process.env.PORT || 3000;
const PRECO_BASE = 4.00;
const PRECO_POR_KM = 1.60;
const PRECO_POR_MIN = 0.30;

// Infraestrutura
const OSRM_URL_BASE = process.env.OSRM_URL || 'http://192.168.0.52:5000/route/v1/driving';
const DB_CONFIG = {
    user: process.env.DB_USER || 'admin',
    host: process.env.DB_HOST || '192.168.0.50',
    database: process.env.DB_NAME || 'gisdb',
    password: process.env.DB_PASS || 'O8Yu8FMsA*Y!%p',
    port: process.env.DB_PORT || 5432
};
const REDIS_URL = process.env.REDIS_URL || 'redis://:1b6S%5EnnVa9%2AGY%40@192.168.0.51:6379';

// --- INICIALIZAÇÃO ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- NOVIDADE 2: Criar Servidor Híbrido (Express + Socket) ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permite que qualquer front-end conecte (dev)
        methods: ["GET", "POST"]
    }
});

// Conexões
const pool = new Pool(DB_CONFIG);
const redisClient = createClient({ url: REDIS_URL });
(async () => {
    try {
        await redisClient.connect();
        console.log("✅ Redis Conectado");
    } catch (e) { console.error("❌ Erro Redis:", e.message); }
})();

// --- NOVIDADE 3: Gerenciar Conexões dos Motoboys ---
io.on('connection', (socket) => {
    console.log(`🔌 Novo dispositivo conectado: ${socket.id}`);

    // Quando o app do motoboy diz "Estou Online"
    socket.on('entrar_como_motorista', (dados) => {
        console.log(`🏍️ Motoboy Online! ID: ${dados.id_motorista}`);
        // Coloca este socket numa "Sala" exclusiva para receber alertas
        socket.join('motoristas_disponiveis'); 
    });

    socket.on('disconnect', () => {
        console.log(`❌ Dispositivo desconectou: ${socket.id}`);
    });
});

// --- ROTAS HTTP ---
app.get('/', (req, res) => res.json({ status: 'TripShare API + Socket Realtime' }));

// ROTA DE SOLICITAR CORRIDA
app.post('/api/solicitar-corrida', async (req, res) => {
    const { id_passageiro, origem, destino } = req.body;

    if (!id_passageiro || !origem || !destino) return res.status(400).json({ erro: 'Dados incompletos' });

    try {
        // 1. Calcular Rota (OSRM)
        //const urlOSRM = `${OSRM_URL_BASE}/${origem};${destino}?overview=false`;
	const urlOSRM = `${OSRM_URL_BASE}/${origem};${destino}?overview=full&geometries=geojson`;
        const response = await axios.get(urlOSRM);
        if (response.data.code !== 'Ok') throw new Error('Erro OSRM');

        const rota = response.data.routes[0];
        const km = rota.distance / 1000;
        const min = rota.duration / 60;
        let preco = PRECO_BASE + (km * PRECO_POR_KM) + (min * PRECO_POR_MIN);
        preco = parseFloat(preco.toFixed(2));

        // 2. Salvar no Banco
        const query = `
            INSERT INTO corridas (
                id_passageiro, origem_texto, destino_texto, 
                distancia_km, tempo_minutos, valor_total,
                origem_geom, destino_geom, status
            ) VALUES ($1, 'Origem GPS', 'Destino GPS', $2, $3, $4, 
                ST_SetSRID(ST_MakePoint($5, $6), 4326),
                ST_SetSRID(ST_MakePoint($7, $8), 4326),
                'pendente'
            ) RETURNING id;
        `;
        const [lonOrig, latOrig] = origem.split(',');
        const [lonDest, latDest] = destino.split(',');
        
        const dbRes = await pool.query(query, [id_passageiro, km, min, preco, lonOrig, latOrig, lonDest, latDest]);
        const novaCorrida = dbRes.rows[0];

        // --- NOVIDADE 4: O GRITO DE ALERTA 📢 ---
        // Aqui enviamos o aviso para todos os celulares conectados na sala 'motoristas_disponiveis'
        io.to('motoristas_disponiveis').emit('alerta_corrida', {
            id_corrida: novaCorrida.id,
            valor: preco,
            distancia: `${km.toFixed(1)} km`,
            tempo: `${min.toFixed(0)} min`,
	    geometria: rota.geometry
        });
        
        console.log(`📡 Alerta enviado para motoboys: Corrida #${novaCorrida.id}`);

        res.json({ sucesso: true, id_corrida: novaCorrida.id, status: 'buscando_moto' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno' });
    }
});

// ATENÇÃO: Mudou de 'app.listen' para 'server.listen'
server.listen(PORTA_API, () => {
    console.log(`🚀 TripShare Backend rodando na porta ${PORTA_API}`);
});


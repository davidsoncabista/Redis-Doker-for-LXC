const { Pool } = require('pg');
const { createClient } = require('redis');
const axios = require('axios');

// --- CONFIGURACOES (IPs dos seus Containers) ---
const DB_CONFIG = {
    user: 'admin',
    host: '192.168.0.50', // IP do PostGIS
    database: 'gisdb',
    password: 'O8Yu8FMsA*Y!%p', // A senha do banco
    port: 5432,
};

const REDIS_URL = 'redis://:1b6S%5EnnVa9%2AGY%40@192.168.0.51:6379'; // IP do Redis + Senha
const OSRM_URL = 'http://192.168.0.52:5000/route/v1/driving/-48.48,-1.45;-48.46,-1.44?overview=false'; // IP do OSRM

async function testarInfraestrutura() {
    console.log("🚀 INICIANDO TESTE GERAL DO TRIPSHARE...\n");

    // 1. TESTE DO BANCO DE DADOS (PostGIS)
    console.log("Testing Conexão com Banco de Dados (PostGIS)...");
    const pool = new Pool(DB_CONFIG);
    try {
        const res = await pool.query('SELECT postgis_full_version()');
        console.log("✅ BANCO DE DADOS: SUCESSO!");
        console.log(`   👉 Versão: ${res.rows[0].postgis_full_version.substring(0, 20)}...`);
    } catch (err) {
        console.error("❌ ERRO NO BANCO:", err.message);
    } finally {
        await pool.end();
    }

    console.log("\n---------------------------------------------------\n");

    // 2. TESTE DO REDIS (Cache/Realtime)
    console.log("Testing Conexão com Redis...");
    const client = createClient({ url: REDIS_URL });
    client.on('error', (err) => console.log('❌ ERRO NO REDIS Client:', err));
    try {
        await client.connect();
        await client.set('teste_tripshare', 'Funcionando!');
        const value = await client.get('teste_tripshare');
        console.log("✅ REDIS: SUCESSO!");
        console.log(`   👉 Valor recuperado do cache: "${value}"`);
    } catch (err) {
        console.error("❌ ERRO NO REDIS:", err.message);
    } finally {
        await client.disconnect();
    }

    console.log("\n---------------------------------------------------\n");

    // 3. TESTE DO OSRM (Mapas)
    console.log("Testing Conexão com OSRM (Mapas)...");
    try {
        const response = await axios.get(OSRM_URL);
        if (response.data.code === 'Ok') {
            const rota = response.data.routes[0];
            console.log("✅ OSRM: SUCESSO!");
            console.log(`   👉 Rota calculada: ${rota.distance} metros em ${rota.duration} segundos.`);
        } else {
            console.error("❌ OSRM respondeu, mas deu erro na rota.");
        }
    } catch (err) {
        console.error("❌ ERRO NO OSRM:", err.message);
    }

    console.log("\n🏁 FIM DOS TESTES.");
}

testarInfraestrutura();

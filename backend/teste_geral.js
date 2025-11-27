require('dotenv').config(); // por davidson Santos Conceicao
const { Pool } = require('pg');
const { createClient } = require('redis');
const axios = require('axios');

// Configs via .env
const DB_CONFIG = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME, 
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
};

const REDIS_URL = process.env.REDIS_URL;
const OSRM_URL_TESTE = `${process.env.OSRM_URL}/-48.502,-1.453;-48.479,-1.382?overview=false`;

async function iniciarTeste() {
    console.clear();
    console.log("=========================================");
    console.log("🚀 TRIPSHARE: TESTE COM VARIÁVEIS DE AMBIENTE");
    console.log("=========================================\n");

    // 1. POSTGIS
    const pool = new Pool(DB_CONFIG);
    process.stdout.write("1️⃣  Banco de Dados... ");
    try {
        const res = await pool.query('SELECT postgis_full_version()');
        console.log("✅ SUCESSO!");
    } catch (err) {
        console.log("❌ FALHA! Verifique o DB_PASS no arquivo .env");
        console.error(err.message);
    } finally { await pool.end(); }

    // 2. REDIS
    const client = createClient({ url: REDIS_URL });
    process.stdout.write("\n2️⃣  Redis... ");
    try {
        await client.connect();
        await client.set('env_test', 'OK');
        console.log("✅ SUCESSO!");
        await client.disconnect();
    } catch (err) {
        console.log("❌ FALHA! Verifique a REDIS_URL no arquivo .env");
        console.error(err.message);
    }

    // 3. OSRM
    process.stdout.write("\n3️⃣  OSRM... ");
    try {
        const res = await axios.get(OSRM_URL_TESTE);
        if(res.data.code === 'Ok') console.log("✅ SUCESSO!");
        else console.log("⚠️  Erro na resposta.");
    } catch (err) {
        console.log("❌ FALHA! Verifique a OSRM_URL no arquivo .env");
        console.error(err.message);
    }
}

iniciarTeste();
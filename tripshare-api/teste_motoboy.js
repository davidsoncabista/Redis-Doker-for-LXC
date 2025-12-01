const { io } = require("socket.io-client");

// Conecta no seu servidor local
const socket = io("http://localhost:3000");

console.log("📱 Iniciando App do Motoboy...");

socket.on("connect", () => {
    console.log(`✅ Conectado ao servidor! ID do Socket: ${socket.id}`);
    
    // Passo importante: Entrar na sala de motoristas
    console.log("👉 Entrando no modo 'Disponível'...");
    socket.emit("entrar_como_motorista", { id_motorista: 99 });
});

// AQUI É ONDE O CELULAR "TOCA"
socket.on("alerta_corrida", (dados) => {
    console.log("\n🚨 🚨 NOVA CORRIDA RECEBIDA! 🚨 🚨");
    console.log(`💰 Valor: R$ ${dados.valor}`);
    console.log(`📍 Distância: ${dados.distancia}`);
    console.log(`🆔 ID: ${dados.id_corrida}`);
    console.log("----------------------------------\n");
});

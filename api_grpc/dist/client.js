"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const PROTO_PATH = path.join(__dirname, '..', 'image.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const imageProto = grpc.loadPackageDefinition(packageDefinition).image;
// Cliente para o servidor Python (porta 50051)
const pythonClient = new imageProto.ImageService('localhost:50051', grpc.credentials.createInsecure());
// Cliente para o servidor Node.js (porta 50052)
const nodeClient = new imageProto.ImageService('localhost:50052', grpc.credentials.createInsecure());
function getImageFromPython() {
    return new Promise((resolve, reject) => {
        pythonClient.GetImage({ id: "1" }, (error, response) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(response.url);
            }
        });
    });
}
function getImageFromNode() {
    return new Promise((resolve, reject) => {
        nodeClient.GetImage({ id: "1" }, (error, response) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(response.url);
            }
        });
    });
}
// Configuração do Express
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Rota GET /getImages
app.get('/getImages', async (req, res) => {
    try {
        console.log('📡 Requisição recebida - Buscando imagens dos dois microsserviços...');
        const [pythonUrl, nodeUrl] = await Promise.all([
            getImageFromPython(),
            getImageFromNode()
        ]);
        const response = {
            python: {
                url: pythonUrl,
                port: 50051
            },
            node: {
                url: nodeUrl,
                port: 50052
            }
        };
        console.log('✅ Imagens obtidas com sucesso');
        res.json(response);
    }
    catch (error) {
        console.error('❌ Erro ao buscar imagens:', error.message);
        res.status(500).json({
            error: 'Erro ao buscar imagens dos microsserviços',
            message: error.message,
            hint: 'Certifique-se de que ambos os servidores estão rodando (Python na porta 50051 e Node.js na porta 50052)'
        });
    }
});
// Rota de health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'API gRPC Client está funcionando' });
});
// Iniciar servidor
app.listen(PORT, () => {
    console.log('✅ Servidor Express iniciado com sucesso!');
    console.log(`🚀 API rodando na porta ${PORT}`);
    console.log(`📡 Endpoint disponível: http://localhost:${PORT}/getImages`);
    console.log(`💚 Health check: http://localhost:${PORT}/health\n`);
});

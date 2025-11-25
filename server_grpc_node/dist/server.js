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
Object.defineProperty(exports, "__esModule", { value: true });
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path = __importStar(require("path"));
const PROTO_PATH = path.join(__dirname, '..', '..', 'api_grpc', 'image.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const imageProto = grpc.loadPackageDefinition(packageDefinition).image;
// URLs de exemplo
const imageUrls = {
    "1": "https://picsum.photos/400/300?random=4",
    "2": "https://picsum.photos/400/300?random=5",
    "default": "https://picsum.photos/400/300?random=6"
};
function getImage(call, callback) {
    const id = call.request.id;
    const url = imageUrls[id] || imageUrls["default"];
    console.log(`📥 Requisição recebida - ID: ${id}, URL retornada: ${url}`);
    callback(null, { url: url });
}
function main() {
    const server = new grpc.Server();
    server.addService(imageProto.ImageService.service, {
        GetImage: getImage
    });
    const port = "50052";
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
            console.error('❌ Erro ao iniciar servidor:', error);
            return;
        }
        server.start();
        console.log('✅ Servidor Node.js gRPC iniciado com sucesso!');
        console.log(`🚀 Rodando na porta ${port}`);
        console.log(`📡 Aguardando requisições...\n`);
    });
}
main();

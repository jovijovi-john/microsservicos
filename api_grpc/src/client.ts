import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import * as fs from 'fs';
import express, { Request, Response } from 'express';

const PROTO_PATH = path.join(__dirname, '..', 'image.proto');

// Verificar se o arquivo proto existe
if (!fs.existsSync(PROTO_PATH)) {
  console.error(`❌ Arquivo proto não encontrado em: ${PROTO_PATH}`);
  console.error(`📁 __dirname: ${__dirname}`);
  process.exit(1);
}

console.log(`✅ Carregando arquivo proto de: ${PROTO_PATH}`);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const imageProto = grpc.loadPackageDefinition(packageDefinition).image as any;

interface ImageRequest {
  id: string;
}

interface ImageResponse {
  url: string;
}

interface ImageServiceClient {
  GetImage(
    request: ImageRequest,
    callback: (error: grpc.ServiceError | null, response: ImageResponse) => void
  ): void;
}

// Configuração dos hosts dos servidores gRPC (usando variáveis de ambiente para Docker)
const PYTHON_GRPC_HOST = process.env.PYTHON_GRPC_HOST || 'localhost';
const NODE_GRPC_HOST = process.env.NODE_GRPC_HOST || 'localhost';

const PYTHON_GRPC_URL = `${PYTHON_GRPC_HOST}:50051`;
const NODE_GRPC_URL = `${NODE_GRPC_HOST}:50052`;

console.log(`🔗 Conectando ao servidor Python gRPC em: ${PYTHON_GRPC_URL}`);
console.log(`🔗 Conectando ao servidor Node.js gRPC em: ${NODE_GRPC_URL}`);

// Configuração de timeout para conexões gRPC
const GRPC_OPTIONS = {
  'grpc.keepalive_time_ms': 30000,
  'grpc.keepalive_timeout_ms': 5000,
  'grpc.keepalive_permit_without_calls': 1,
  'grpc.http2.max_pings_without_data': 0,
  'grpc.http2.min_time_between_pings_ms': 10000,
  'grpc.http2.min_ping_interval_without_data_ms': 300000
};

// Cliente para o servidor Python (porta 50051)
const pythonClient = new imageProto.ImageService(
  PYTHON_GRPC_URL,
  grpc.credentials.createInsecure(),
  GRPC_OPTIONS
) as ImageServiceClient;

// Cliente para o servidor Node.js (porta 50052)
const nodeClient = new imageProto.ImageService(
  NODE_GRPC_URL,
  grpc.credentials.createInsecure(),
  GRPC_OPTIONS
) as ImageServiceClient;

function getImageFromPython(): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`📤 Enviando requisição para servidor Python em ${PYTHON_GRPC_URL}...`);
    pythonClient.GetImage({ id: "1" }, (error, response) => {
      if (error) {
        console.error(`❌ Erro ao conectar com servidor Python:`, error.message);
        console.error(`   Código: ${error.code}, Detalhes: ${error.details}`);
        reject(error);
      } else {
        console.log(`✅ Resposta recebida do servidor Python: ${response.url}`);
        resolve(response.url);
      }
    });
  });
}

function getImageFromNode(): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`📤 Enviando requisição para servidor Node.js em ${NODE_GRPC_URL}...`);
    nodeClient.GetImage({ id: "1" }, (error, response) => {
      if (error) {
        console.error(`❌ Erro ao conectar com servidor Node.js:`, error.message);
        console.error(`   Código: ${error.code}, Detalhes: ${error.details}`);
        reject(error);
      } else {
        console.log(`✅ Resposta recebida do servidor Node.js: ${response.url}`);
        resolve(response.url);
      }
    });
  });
}

// Configuração do Express
const app = express();
const PORT = process.env.PORT || 3000;

// Rota GET /getImages
app.get('/getImages', async (req: Request, res: Response) => {
  try {
    console.log('📡 Requisição recebida - Buscando imagens dos dois microsserviços...');
    
    // Usar Promise.allSettled para capturar erros individuais
    const results = await Promise.allSettled([
      getImageFromPython(),
      getImageFromNode()
    ]);
    
    const pythonResult = results[0];
    const nodeResult = results[1];
    
    // Verificar se algum falhou
    if (pythonResult.status === 'rejected' || nodeResult.status === 'rejected') {
      const errors: string[] = [];
      if (pythonResult.status === 'rejected') {
        errors.push(`Python gRPC (${PYTHON_GRPC_URL}): ${pythonResult.reason?.message || pythonResult.reason}`);
      }
      if (nodeResult.status === 'rejected') {
        errors.push(`Node.js gRPC (${NODE_GRPC_URL}): ${nodeResult.reason?.message || nodeResult.reason}`);
      }
      
      console.error('❌ Erro ao buscar imagens:', errors);
      return res.status(500).json({
        error: 'Erro ao buscar imagens dos microsserviços',
        details: errors,
        hint: 'Certifique-se de que ambos os servidores estão rodando e acessíveis'
      });
    }
    
    const response = {
      python: {
        url: pythonResult.value,
        port: 50051
      },
      node: {
        url: nodeResult.value,
        port: 50052
      }
    };
    
    console.log('✅ Imagens obtidas com sucesso');
    res.json(response);
    
  } catch (error: any) {
    console.error('❌ Erro inesperado ao buscar imagens:', error);
    res.status(500).json({
      error: 'Erro inesperado ao buscar imagens dos microsserviços',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Rota de health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API gRPC Client está funcionando' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('✅ Servidor Express iniciado com sucesso!');
  console.log(`🚀 API rodando na porta ${PORT}`);
  console.log(`📡 Endpoint disponível: http://localhost:${PORT}/getImages`);
  console.log(`💚 Health check: http://localhost:${PORT}/health\n`);
});


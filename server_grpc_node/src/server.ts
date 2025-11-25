import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

// No Docker, o proto está em /app/image.proto, localmente está em ../api_grpc/image.proto
const PROTO_PATH = path.join(__dirname, '..', 'image.proto');

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

interface ImageCall {
  request: ImageRequest;
}

// URLs de exemplo
const imageUrls: Record<string, string> = {
  "1": "https://picsum.photos/400/300?random=4",
  "2": "https://picsum.photos/400/300?random=5",
  "default": "https://picsum.photos/400/300?random=6"
};

function getImage(call: ImageCall, callback: grpc.sendUnaryData<ImageResponse>): void {
  const id = call.request.id;
  const url = imageUrls[id] || imageUrls["default"];
  
  console.log(`📥 Requisição recebida - ID: ${id}, URL retornada: ${url}`);
  callback(null, { url: url });
}

function main(): void {
  const server = new grpc.Server();
  
  server.addService(imageProto.ImageService.service, {
    GetImage: getImage
  });
  
  const port = "50052";
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error: Error | null, port: number) => {
      if (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        return;
      }
      server.start();
      console.log('✅ Servidor Node.js gRPC iniciado com sucesso!');
      console.log(`🚀 Rodando na porta ${port}`);
      console.log(`📡 Aguardando requisições...\n`);
    }
  );
}

main();


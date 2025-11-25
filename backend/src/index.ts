import express, { Request, Response } from 'express';
import * as amqp from 'amqplib';
import cors from 'cors';
import { Imagem, ImagensResponse, ImagensPorOrigemResponse, GrpcImagesResponse } from './types';

const app = express();
const PORT = process.env.PORT || 3000;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const API_GRPC_URL = process.env.API_GRPC_URL || 'http://api_grpc:3000';

// Armazena as imagens recebidas dos microsserviços (fila)
let imagensFila: Imagem[] = [];

app.use(cors());
app.use(express.json());

// Função para buscar imagens do gRPC
async function buscarImagensGrpc(): Promise<Imagem[]> {
  try {
    const response = await fetch(`${API_GRPC_URL}/getImages`);
    if (!response.ok) {
      console.error(`Erro ao buscar imagens do gRPC: ${response.status} ${response.statusText}`);
      return [];
    }
    const data = await response.json() as GrpcImagesResponse;
    
    const imagensGrpc: Imagem[] = [];
    
    if (data.python?.url) {
      imagensGrpc.push({
        url: data.python.url,
        origem: 'grpc_python',
        timestamp: new Date().toISOString()
      });
    }
    
    if (data.node?.url) {
      imagensGrpc.push({
        url: data.node.url,
        origem: 'grpc_node',
        timestamp: new Date().toISOString()
      });
    }
    
    return imagensGrpc;
  } catch (error) {
    console.error('Erro ao buscar imagens do gRPC:', error);
    return [];
  }
}

// Endpoint para obter todas as imagens
app.get('/api/imagens', async (req: Request, res: Response<ImagensResponse>) => {
  try {
    // Busca imagens do gRPC
    const imagensGrpc = await buscarImagensGrpc();
    
    // Combina imagens da fila com imagens do gRPC
    const todasImagens = [...imagensFila, ...imagensGrpc];
    
    res.json({
      total: todasImagens.length,
      imagens: todasImagens,
      imagensFila: imagensFila,
      imagensGrpc: imagensGrpc
    });
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({
      total: imagensFila.length,
      imagens: imagensFila,
      imagensFila: imagensFila,
      imagensGrpc: []
    });
  }
});

// Endpoint para obter imagens de um microsserviço específico
app.get('/api/imagens/:origem', async (req: Request, res: Response<ImagensPorOrigemResponse>) => {
  const { origem } = req.params;
  
  try {
    let imagensFiltradas: Imagem[] = [];
    
    // Se for origem gRPC, busca do api_grpc
    if (origem === 'grpc_python' || origem === 'grpc_node') {
      const imagensGrpc = await buscarImagensGrpc();
      imagensFiltradas = imagensGrpc.filter(img => img.origem === origem);
    } else {
      // Caso contrário, filtra da fila
      imagensFiltradas = imagensFila.filter(img => img.origem === origem);
    }
    
    res.json({
      total: imagensFiltradas.length,
      origem: origem,
      imagens: imagensFiltradas,
      imagensFila: origem.startsWith('grpc') ? [] : imagensFiltradas,
      imagensGrpc: origem.startsWith('grpc') ? imagensFiltradas : []
    });
  } catch (error) {
    console.error('Erro ao buscar imagens por origem:', error);
    res.status(500).json({
      total: 0,
      origem: origem,
      imagens: [],
      imagensFila: [],
      imagensGrpc: []
    });
  }
});

// Endpoint para limpar imagens (opcional) - apenas da fila
app.delete('/api/imagens', (req: Request, res: Response<{ message: string }>) => {
  imagensFila = [];
  res.json({ message: 'Imagens da fila limpas com sucesso' });
});

// Função para consumir mensagens do RabbitMQ
async function consumirMensagens(): Promise<void> {
  try {
    console.log('Conectando ao RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Consome mensagens da fila do microsserviço 1
    await channel.assertQueue('imagens_microsservico1', { durable: true });
    channel.consume('imagens_microsservico1', (msg: amqp.ConsumeMessage | null) => {
      if (msg) {
        try {
          const imagem: Imagem = JSON.parse(msg.content.toString());
          imagensFila.push(imagem);
          console.log(`[Backend] Imagem recebida do microsserviço 1: ${imagem.url}`);
          channel.ack(msg);
        } catch (error) {
          console.error('Erro ao processar mensagem do microsserviço 1:', error);
          channel.nack(msg, false, false);
        }
      }
    });

    // Consome mensagens da fila do microsserviço 2
    await channel.assertQueue('imagens_microsservico2', { durable: true });
    channel.consume('imagens_microsservico2', (msg: amqp.ConsumeMessage | null) => {
      if (msg) {
        try {
          const imagem: Imagem = JSON.parse(msg.content.toString());
          imagensFila.push(imagem);
          console.log(`[Backend] Imagem recebida do microsserviço 2: ${imagem.url}`);
          channel.ack(msg);
        } catch (error) {
          console.error('Erro ao processar mensagem do microsserviço 2:', error);
          channel.nack(msg, false, false);
        }
      }
    });

    console.log('Aguardando mensagens dos microsserviços...');
  } catch (error) {
    console.error('Erro ao conectar ao RabbitMQ:', error);
    console.log('Tentando reconectar em 5 segundos...');
    setTimeout(consumirMensagens, 5000);
  }
}

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
  consumirMensagens();
});


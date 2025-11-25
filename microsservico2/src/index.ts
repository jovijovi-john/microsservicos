import * as amqp from 'amqplib';
import { ImagemMensagem } from './types';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const QUEUE_NAME = 'imagens_microsservico2';

// Serviços de imagens aleatórias diferentes do microsserviço 1
const IMAGE_SERVICES: string[] = [
  'https://picsum.photos/800/600',
  'https://picsum.photos/700/500',
  'https://picsum.photos/900/700',
];

function gerarUrlImagemAleatoria(): string {
  const service = IMAGE_SERVICES[Math.floor(Math.random() * IMAGE_SERVICES.length)];
  if (service.includes('picsum')) {
    // Adiciona um ID aleatório para garantir imagens diferentes
    return `${service}?random=${Math.floor(Math.random() * 10000)}`;
  }
  return service;
}

async function iniciarMicrosservico(): Promise<void> {
  try {
    console.log('Conectando ao RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Garante que a fila existe
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log('Microsserviço 2 iniciado. Gerando imagens...');

    // Gera uma imagem a cada 4 segundos (diferente do microsserviço 1)
    setInterval(async () => {
      const urlImagem = gerarUrlImagemAleatoria();
      const mensagem: ImagemMensagem = {
        url: urlImagem,
        origem: 'microsservico2',
        timestamp: new Date().toISOString()
      };

      channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(mensagem)), { persistent: true });
      console.log(`[Microsserviço 2] Imagem enviada: ${urlImagem}`);
    }, 4000);

  } catch (error) {
    console.error('Erro no microsserviço 2:', error);
    setTimeout(iniciarMicrosservico, 5000); // Tenta reconectar após 5 segundos
  }
}

iniciarMicrosservico();


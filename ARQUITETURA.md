# Arquitetura e Funcionamento do Sistema de Microsserviços

## 📋 Visão Geral

Este projeto demonstra uma arquitetura híbrida de **microsserviços** que combina:
- **Comunicação assíncrona** via **filas de mensageria (RabbitMQ)** - dois microsserviços geram imagens
- **Comunicação síncrona** via **gRPC** - dois servidores gRPC (Python e Node.js) fornecem imagens
- **Backend agregador** que consome ambas as fontes e expõe uma API REST unificada
- **Frontend** com tema dark que exibe todas as imagens com filtros por origem

O sistema é totalmente containerizado usando Docker e desenvolvido em TypeScript e Python.

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│                  (index.html - Dark Theme)                  │
│  Interface web que consome a API REST do Backend           │
│  • Filtros por origem (Fila, gRPC, MS1, MS2, etc.)        │
│  • Estatísticas em tempo real                              │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
                       │ GET /api/imagens
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND                                │
│              (Express + TypeScript)                         │
│  • API REST (porta 8080)                                    │
│  • Consome mensagens do RabbitMQ                            │
│  • Faz requisições HTTP ao api_grpc                         │
│  • Combina imagens da fila + gRPC                           │
│  • Armazena imagens da fila em memória                      │
└──────┬──────────────────────────────┬───────────────────────┘
       │                              │
       │ Consome                      │ HTTP/REST
       │ Fila: imagens_microsservico1 │ GET /getImages
       │ Fila: imagens_microsservico2 │
       ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RABBITMQ                                 │
│              (Message Broker)                               │
│  • Gerencia filas de mensagens                             │
│  • Desacopla comunicação entre serviços                   │
└──────┬──────────────────────────────┬───────────────────────┘
       │                              │
       │ Publica                      │
       │ Fila: imagens_microsservico1 │
       │ Fila: imagens_microsservico2 │
       ▼                              │
┌──────────────────────────┐          │
│   MICROSSERVIÇO 1        │          │
│   (TypeScript)           │          │
│                           │          │
│ • Gera URLs de imagens   │          │
│   a cada 3 segundos      │          │
│ • Tamanhos: 400x300,      │          │
│   500x400, 600x500       │          │
│ • Envia para RabbitMQ    │          │
└──────────────────────────┘          │
                                      │
┌──────────────────────────┐          │
│   MICROSSERVIÇO 2        │          │
│   (TypeScript)           │          │
│                           │          │
│ • Gera URLs de imagens   │          │
│   a cada 4 segundos      │          │
│ • Tamanhos: 800x600,      │          │
│   700x500, 900x700      │          │
│ • Envia para RabbitMQ    │          │
└──────────────────────────┘          │
                                      │
┌─────────────────────────────────────────────────────────────┐
│                    API gRPC CLIENT                          │
│              (Express + TypeScript)                         │
│  • Porta 3002                                              │
│  • Consome servidores gRPC                                  │
│  • Expõe endpoint HTTP /getImages                           │
└──────┬──────────────────────────────┬───────────────────────┘
       │                              │
       │ gRPC                         │ gRPC
       │ GetImage()                   │ GetImage()
       ▼                              ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   SERVIDOR gRPC PYTHON   │  │   SERVIDOR gRPC NODE.JS   │
│   (Python)               │  │   (TypeScript)            │
│                           │  │                           │
│ • Porta 50051            │  │ • Porta 50052             │
│ • Retorna URLs de imagens │  │ • Retorna URLs de imagens │
│ • Implementa ImageService │  │ • Implementa ImageService │
└──────────────────────────┘  └──────────────────────────┘
```

## 🔄 Fluxo de Dados

### 1. Geração de Imagens (Microsserviços)

**Microsserviço 1:**
- A cada **3 segundos**, gera uma URL de imagem aleatória
- Usa serviços como Picsum Photos e Unsplash
- Tamanhos menores: 400x300, 500x400, 600x500
- Cria uma mensagem JSON com:
  ```typescript
  {
    url: "https://picsum.photos/400/300?random=1234",
    origem: "microsservico1",
    timestamp: "2024-01-15T10:30:00.000Z"
  }
  ```
- Publica na fila `imagens_microsservico1` do RabbitMQ

**Microsserviço 2:**
- A cada **4 segundos**, gera uma URL de imagem aleatória
- Usa os mesmos serviços, mas com tamanhos maiores
- Tamanhos maiores: 800x600, 700x500, 900x700
- Cria mensagem similar, mas com `origem: "microsservico2"`
- Publica na fila `imagens_microsservico2` do RabbitMQ

### 2. Processamento de Mensagens (RabbitMQ)

- RabbitMQ recebe as mensagens dos microsserviços
- Armazena nas filas correspondentes (`imagens_microsservico1` e `imagens_microsservico2`)
- As filas são **duráveis** (persistem mesmo se o RabbitMQ reiniciar)
- As mensagens são **persistentes** (não são perdidas se o servidor cair)

### 3. Consumo e Armazenamento (Backend)

- Backend conecta ao RabbitMQ e **consome** mensagens das duas filas
- Para cada mensagem recebida:
  1. Faz o **parse** do JSON
  2. Adiciona a imagem ao array em memória
  3. Envia **ACK** (acknowledgment) ao RabbitMQ confirmando processamento
  4. Loga a recepção da imagem
- Se houver erro no processamento, envia **NACK** (negative acknowledgment)

### 4. Comunicação gRPC

**Servidores gRPC:**
- **Python (porta 50051)**: Implementa `ImageService.GetImage()` e retorna URLs de imagens
- **Node.js (porta 50052)**: Implementa `ImageService.GetImage()` e retorna URLs de imagens
- Ambos usam Protocol Buffers para serialização

**API gRPC Client:**
- Consome ambos os servidores gRPC via chamadas síncronas
- Expõe endpoint HTTP `GET /getImages` que retorna:
  ```json
  {
    "python": {
      "url": "https://picsum.photos/400/300?random=1",
      "port": 50051
    },
    "node": {
      "url": "https://picsum.photos/400/300?random=2",
      "port": 50052
    }
  }
  ```

### 5. Agregação no Backend

O backend agora:
- Consome mensagens do RabbitMQ (assíncrono)
- Faz requisições HTTP ao `api_grpc` para obter imagens do gRPC (síncrono)
- Combina ambas as fontes em uma resposta unificada
- Armazena apenas imagens da fila em memória (imagens gRPC são buscadas em tempo real)

### 6. Exposição via API REST (Backend)

O backend expõe três endpoints:

**GET /api/imagens**
- Retorna todas as imagens (fila + gRPC)
- Resposta:
  ```json
  {
    "total": 52,
    "imagens": [
      {
        "url": "https://picsum.photos/400/300?random=1234",
        "origem": "microsservico1",
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      {
        "url": "https://picsum.photos/400/300?random=1",
        "origem": "grpc_python",
        "timestamp": "2024-01-15T10:30:01.000Z"
      },
      {
        "url": "https://picsum.photos/400/300?random=2",
        "origem": "grpc_node",
        "timestamp": "2024-01-15T10:30:01.000Z"
      },
      ...
    ],
    "imagensFila": [...],
    "imagensGrpc": [...]
  }
  ```

**GET /api/imagens/:origem**
- Filtra imagens por origem
- Origens disponíveis: `microsservico1`, `microsservico2`, `grpc_python`, `grpc_node`
- Exemplo: `GET /api/imagens/grpc_python`
- Resposta similar, mas apenas com imagens da origem especificada

**DELETE /api/imagens**
- Limpa todas as imagens da fila armazenadas em memória
- Não afeta imagens do gRPC (são buscadas em tempo real)
- Útil para testes e reset do sistema

### 7. Visualização (Frontend)

- Interface web em HTML/CSS/JavaScript puro com **tema dark** (preto e branco)
- Faz requisições HTTP ao backend
- Exibe as imagens em um grid responsivo
- Funcionalidades:
  - **Carregar Todas**: Busca todas as imagens do backend (fila + gRPC)
  - **Filtros por Origem**: 
    - Apenas MS1 (Microsserviço 1)
    - Apenas MS2 (Microsserviço 2)
    - Apenas gRPC Python
    - Apenas gRPC Node
    - Apenas Fila (todas as imagens do RabbitMQ)
    - Apenas gRPC (todas as imagens do gRPC)
  - **Auto-refresh**: Atualiza automaticamente a cada 2 segundos
  - **Limpar Galeria**: Remove todas as imagens da fila do backend
  - **Estatísticas**: Mostra total de imagens, imagens da fila, imagens do gRPC, e contagem por origem
  - **Badges visuais**: Identificação visual por origem (MS1, MS2, gRPC Python, gRPC Node)

## 🛠️ Tecnologias Utilizadas

### Backend e Microsserviços
- **TypeScript**: Linguagem de programação com tipagem estática
- **Node.js**: Runtime JavaScript
- **Express**: Framework web para a API REST
- **amqplib**: Cliente RabbitMQ para Node.js
- **CORS**: Middleware para permitir requisições cross-origin

### Mensageria
- **RabbitMQ**: Sistema de mensageria baseado em AMQP
  - Gerencia filas de mensagens
  - Garante entrega das mensagens
  - Permite desacoplamento entre serviços
  - Comunicação assíncrona

### Comunicação RPC
- **gRPC**: Framework de comunicação RPC de alto desempenho
  - Comunicação síncrona
  - Protocol Buffers para serialização eficiente
  - Suporte a múltiplas linguagens (Python e Node.js)
  - Tipagem forte via arquivos `.proto`

### Containerização
- **Docker**: Containerização dos serviços
- **Docker Compose**: Orquestração de múltiplos containers
- **Alpine Linux**: Imagens base leves e otimizadas

### Frontend
- **HTML5**: Estrutura
- **CSS3**: Estilização moderna com tema dark (preto e branco)
- **JavaScript (Vanilla)**: Lógica do cliente sem frameworks
- **Fetch API**: Para requisições HTTP assíncronas

## 🔐 Comunicação entre Serviços

### Dentro do Docker (Rede Interna)

Todos os serviços estão na mesma rede Docker (`microsservicos-network`):

- **Backend** → RabbitMQ: `amqp://rabbitmq:5672`
- **Backend** → API gRPC: `http://api_grpc:3000`
- **Microsserviço 1** → RabbitMQ: `amqp://rabbitmq:5672`
- **Microsserviço 2** → RabbitMQ: `amqp://rabbitmq:5672`
- **API gRPC** → Server gRPC Python: `server_grpc_python:50051`
- **API gRPC** → Server gRPC Node.js: `server_grpc_node:50052`
- **Frontend** → Backend: `http://localhost:8080`

Os nomes dos serviços são resolvidos pelo Docker DNS interno, permitindo comunicação entre containers sem expor portas desnecessariamente.

### Portas Expostas

- **8080**: Backend API (mapeada da porta 3000 interna)
- **3002**: API gRPC Client (mapeada da porta 3000 interna)
- **50051**: Servidor gRPC Python
- **50052**: Servidor gRPC Node.js
- **15673**: RabbitMQ Management UI (mapeada da porta 15672 interna)
- **5672**: Não exposta externamente (apenas comunicação interna)

## 📊 Características Importantes

### Desacoplamento
- Microsserviços não conhecem o backend diretamente
- Comunicação assíncrona via filas
- Cada serviço pode ser escalado independentemente

### Resiliência
- Reconexão automática ao RabbitMQ em caso de falha
- Mensagens persistentes (não são perdidas)
- Health checks no RabbitMQ

### Escalabilidade
- Cada microsserviço pode ter múltiplas instâncias
- Backend pode ter múltiplas instâncias consumindo as mesmas filas
- RabbitMQ distribui mensagens entre consumidores

### Observabilidade
- Logs detalhados em cada serviço
- RabbitMQ Management UI para monitorar filas
- Frontend mostra estatísticas em tempo real

## 🚀 Execução do Sistema

### Com Docker Compose (Recomendado)

```bash
# Iniciar todos os serviços
docker compose up --build -d

# Ver logs
docker compose logs -f

# Parar serviços
docker compose down
```

### Fluxo de Inicialização

1. **RabbitMQ** inicia primeiro (health check configurado)
2. **Servidores gRPC** (Python e Node.js) iniciam
3. **API gRPC Client** inicia e conecta aos servidores gRPC
4. Quando RabbitMQ está saudável, **Backend** e **Microsserviços** iniciam
5. Cada microsserviço conecta ao RabbitMQ e cria sua fila
6. Backend conecta ao RabbitMQ e começa a consumir mensagens
7. Backend também está pronto para fazer requisições ao api_grpc
8. Microsserviços começam a gerar e enviar imagens para RabbitMQ
9. Backend recebe mensagens do RabbitMQ e armazena em memória
10. Quando o frontend faz requisição, o backend busca imagens do gRPC em tempo real
11. Backend combina imagens da fila + gRPC e retorna ao frontend
12. Frontend exibe todas as imagens com filtros e estatísticas

## 📝 Estrutura de Mensagens

### Mensagem Enviada pelos Microsserviços

```json
{
  "url": "https://picsum.photos/400/300?random=7151",
  "origem": "microsservico1",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Resposta da API

```json
{
  "total": 27,
  "imagens": [
    {
      "url": "https://picsum.photos/400/300?random=7151",
      "origem": "microsservico1",
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    {
      "url": "https://picsum.photos/800/600?random=1234",
      "origem": "microsservico2",
      "timestamp": "2024-01-15T10:30:04.000Z"
    },
    {
      "url": "https://picsum.photos/400/300?random=1",
      "origem": "grpc_python",
      "timestamp": "2024-01-15T10:30:05.000Z"
    },
    {
      "url": "https://picsum.photos/400/300?random=2",
      "origem": "grpc_node",
      "timestamp": "2024-01-15T10:30:05.000Z"
    }
  ],
  "imagensFila": [
    {
      "url": "https://picsum.photos/400/300?random=7151",
      "origem": "microsservico1",
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    {
      "url": "https://picsum.photos/800/600?random=1234",
      "origem": "microsservico2",
      "timestamp": "2024-01-15T10:30:04.000Z"
    }
  ],
  "imagensGrpc": [
    {
      "url": "https://picsum.photos/400/300?random=1",
      "origem": "grpc_python",
      "timestamp": "2024-01-15T10:30:05.000Z"
    },
    {
      "url": "https://picsum.photos/400/300?random=2",
      "origem": "grpc_node",
      "timestamp": "2024-01-15T10:30:05.000Z"
    }
  ]
}
```

## ⚠️ Limitações e Considerações

1. **Armazenamento em Memória**: As imagens da fila são armazenadas apenas em memória. Ao reiniciar o backend, essas imagens são perdidas. As imagens do gRPC são buscadas em tempo real a cada requisição.

2. **Sem Persistência**: Para produção, seria necessário um banco de dados (PostgreSQL, MongoDB, etc.) para persistir as imagens da fila.

3. **Sem Autenticação**: A API não possui autenticação/autorização. Em produção, seria necessário implementar segurança.

4. **Rate Limiting**: Não há controle de taxa de requisições. Em produção, seria necessário implementar rate limiting.

5. **Monitoramento**: Logs básicos estão implementados, mas para produção seria necessário um sistema de monitoramento mais robusto (Prometheus, Grafana, etc.).

6. **Comunicação Híbrida**: O sistema combina comunicação assíncrona (RabbitMQ) e síncrona (gRPC), demonstrando diferentes padrões de comunicação em microsserviços.

7. **Tema Dark**: O frontend possui tema dark (preto e branco) para melhor experiência visual.

## 🎯 Casos de Uso

Este projeto demonstra:
- Arquitetura híbrida de microsserviços
- Comunicação assíncrona via mensageria (RabbitMQ)
- Comunicação síncrona via gRPC
- Agregação de múltiplas fontes de dados
- Desacoplamento de serviços
- Containerização com Docker
- TypeScript em projetos Node.js
- Python em serviços gRPC
- Protocol Buffers para serialização
- API REST com Express
- Frontend com tema dark e filtros avançados

É ideal para:
- Aprendizado de arquitetura de microsserviços
- Demonstração de diferentes padrões de comunicação (assíncrona e síncrona)
- Comparação entre RabbitMQ e gRPC
- Base para projetos mais complexos
- Prototipagem rápida de sistemas distribuídos
- Estudo de integração de múltiplas tecnologias


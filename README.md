# Sistema de Microsserviços com RabbitMQ e gRPC

Este projeto demonstra uma arquitetura de microsserviços híbrida onde:
- **Dois microsserviços** geram URLs de imagens aleatórias e as enviam para um backend principal através de **filas RabbitMQ**
- **Dois servidores gRPC** (Python e Node.js) fornecem imagens via comunicação síncrona gRPC
- **Backend principal** agrega imagens de ambas as fontes (RabbitMQ e gRPC) e expõe uma API REST unificada
- **Frontend** com tema dark exibe todas as imagens com filtros por origem

> 📖 **Para uma explicação detalhada da arquitetura e funcionamento do sistema, consulte o arquivo [ARQUITETURA.md](./ARQUITETURA.md)**

## Estrutura do Projeto

```
microsservicos/
├── frontend/
│   └── index.html          # Interface web dark theme para visualizar as imagens
├── backend/
│   ├── src/
│   │   ├── index.ts        # API principal que consome RabbitMQ e api_grpc (TypeScript)
│   │   └── types.ts        # Tipos TypeScript
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
├── microsservico1/
│   ├── src/
│   │   ├── index.ts        # Microsserviço 1 - Gera imagens via RabbitMQ (TypeScript)
│   │   └── types.ts        # Tipos TypeScript
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
├── microsservico2/
│   ├── src/
│   │   ├── index.ts        # Microsserviço 2 - Gera imagens via RabbitMQ (TypeScript)
│   │   └── types.ts        # Tipos TypeScript
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
├── api_grpc/
│   ├── src/
│   │   └── client.ts       # Cliente gRPC que consome servidores Python e Node.js
│   ├── image.proto         # Definição do protocolo gRPC
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
├── server_grpc_python/
│   ├── server.py           # Servidor gRPC em Python
│   ├── Dockerfile
│   └── requirements.txt
├── server_grpc_node/
│   ├── src/
│   │   └── server.ts       # Servidor gRPC em Node.js (TypeScript)
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
└── docker-compose.yml      # Orquestração de todos os serviços
```

## Pré-requisitos

- Docker e Docker Compose instalados

### Instalando Docker e Docker Compose

**Ubuntu/Debian:**
```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

## Executando o Sistema com Docker Compose

A forma mais simples de executar todo o sistema é usando Docker Compose:

### 1. Construir e iniciar todos os serviços

```bash
docker-compose up --build
```

Este comando irá:
- Construir as imagens Docker de todos os serviços
- Iniciar o RabbitMQ
- Iniciar os servidores gRPC (Python e Node.js)
- Iniciar o api_grpc (cliente gRPC)
- Iniciar o backend principal
- Iniciar os dois microsserviços (RabbitMQ)
- Configurar a rede entre todos os serviços

### 2. Executar em background

```bash
docker-compose up -d --build
```

### 3. Ver logs dos serviços

```bash
# Todos os serviços
docker-compose logs -f

# Apenas um serviço específico
docker-compose logs -f backend
docker-compose logs -f api_grpc
docker-compose logs -f server_grpc_python
docker-compose logs -f server_grpc_node
docker-compose logs -f microsservico1
docker-compose logs -f microsservico2
docker-compose logs -f rabbitmq
```

### 4. Parar os serviços

```bash
docker-compose down
```

### 5. Parar e remover volumes (limpar dados do RabbitMQ)

```bash
docker-compose down -v
```

## Acessando os Serviços

- **Backend API**: http://localhost:8080
- **API gRPC Client**: http://localhost:3002
- **Servidor gRPC Python**: localhost:50051 (gRPC)
- **Servidor gRPC Node.js**: localhost:50052 (gRPC)
- **RabbitMQ Management UI**: http://localhost:15673
  - Usuário: `guest`
  - Senha: `guest`
- **Frontend**: Abra o arquivo `frontend/index.html` no navegador ou use um servidor HTTP:
  ```bash
  cd frontend
  python3 -m http.server 8080
  # ou
  npx serve .
  ```
  Depois acesse: `http://localhost:8080`

## Executando Localmente (sem Docker)

Se preferir executar sem Docker:

### Pré-requisitos
- Node.js (versão 20 ou superior)
- RabbitMQ instalado e rodando localmente

### Instalação

1. Instale as dependências de cada serviço:

```bash
# Backend principal
cd backend
npm install
npm run build

# Microsserviço 1
cd ../microsservico1
npm install
npm run build

# Microsserviço 2
cd ../microsservico2
npm install
npm run build
```

### Executando

Abra 4 terminais diferentes:

**Terminal 1 - Backend Principal**
```bash
cd backend
npm start
```

**Terminal 2 - Microsserviço 1**
```bash
cd microsservico1
npm start
```

**Terminal 3 - Microsserviço 2**
```bash
cd microsservico2
npm start
```

**Terminal 4 - Frontend**
```bash
cd frontend
python3 -m http.server 8080
```

## Como Funciona

1. **Microsserviços 1 e 2**: Geram URLs de imagens aleatórias a cada 3-4 segundos e enviam para filas RabbitMQ
2. **Servidores gRPC**: Fornecem imagens via comunicação síncrona gRPC (Python na porta 50051, Node.js na porta 50052)
3. **API gRPC Client**: Consome os servidores gRPC e expõe um endpoint HTTP para o backend
4. **Backend**: 
   - Consome mensagens das filas RabbitMQ
   - Faz requisições HTTP ao api_grpc para obter imagens do gRPC
   - Combina imagens de ambas as fontes
   - Armazena imagens da fila em memória
5. **Frontend**: Faz requisições HTTP ao backend para obter e exibir todas as imagens (fila + gRPC) com tema dark e filtros por origem

## Endpoints da API

### Backend Principal (porta 8080)

- `GET /api/imagens` - Retorna todas as imagens (fila + gRPC)
  ```json
  {
    "total": 10,
    "imagens": [...],
    "imagensFila": [...],
    "imagensGrpc": [...]
  }
  ```
- `GET /api/imagens/:origem` - Retorna imagens de uma origem específica
  - Origens disponíveis: `microsservico1`, `microsservico2`, `grpc_python`, `grpc_node`
- `DELETE /api/imagens` - Limpa todas as imagens da fila armazenadas

### API gRPC Client (porta 3002)

- `GET /getImages` - Retorna imagens dos servidores gRPC
  ```json
  {
    "python": {
      "url": "...",
      "port": 50051
    },
    "node": {
      "url": "...",
      "port": 50052
    }
  }
  ```
- `GET /health` - Health check do serviço

## Variáveis de Ambiente

No Docker Compose, as variáveis de ambiente são configuradas automaticamente. Para execução local, você pode configurar:

### Backend
```bash
export RABBITMQ_URL=amqp://usuario:senha@localhost:5672
export API_GRPC_URL=http://localhost:3002
export PORT=3000
```

### API gRPC Client
```bash
export PORT=3000
export PYTHON_GRPC_HOST=localhost
export NODE_GRPC_HOST=localhost
```

### Microsserviços
```bash
export RABBITMQ_URL=amqp://usuario:senha@localhost:5672
```

## Tecnologias Utilizadas

- **TypeScript**: Linguagem de programação (backend, microsserviços, api_grpc, server_grpc_node)
- **Python**: Linguagem de programação (server_grpc_python)
- **Node.js**: Runtime JavaScript
- **Express**: Framework web para a API
- **RabbitMQ**: Sistema de mensageria assíncrona
- **gRPC**: Framework de comunicação RPC síncrona
- **Protocol Buffers**: Serialização de dados para gRPC
- **Docker**: Containerização
- **Docker Compose**: Orquestração de containers

## Notas

- As imagens da fila são armazenadas em memória no backend. Ao reiniciar o backend, essas imagens serão perdidas.
- As imagens do gRPC são buscadas em tempo real a cada requisição, não são armazenadas.
- Os microsserviços tentam reconectar automaticamente ao RabbitMQ em caso de falha.
- O frontend possui um modo de auto-refresh que atualiza as imagens automaticamente a cada 2 segundos.
- O frontend possui tema dark (preto e branco) e filtros para visualizar imagens por origem.
- Todos os serviços Node.js são desenvolvidos em TypeScript e compilados para JavaScript antes da execução.

## Desenvolvimento

Para desenvolvimento local com hot-reload, você pode usar `ts-node`:

```bash
# Backend
cd backend
npm run dev

# API gRPC Client
cd api_grpc
npm run dev

# Servidor gRPC Node.js
cd server_grpc_node
npm run dev

# Microsserviço 1
cd microsservico1
npm run dev

# Microsserviço 2
cd microsservico2
npm run dev

# Servidor gRPC Python
cd server_grpc_python
python server.py
```

# Sistema de Microsserviços com RabbitMQ

Este projeto demonstra uma arquitetura de microsserviços onde dois microsserviços geram URLs de imagens aleatórias e as enviam para um backend principal através de filas RabbitMQ.

> 📖 **Para uma explicação detalhada da arquitetura e funcionamento do sistema, consulte o arquivo [ARQUITETURA.md](./ARQUITETURA.md)**

## Estrutura do Projeto

```
microsservicos/
├── frontend/
│   └── index.html          # Interface web para visualizar as imagens
├── backend/
│   ├── src/
│   │   ├── index.ts        # API principal que consome RabbitMQ (TypeScript)
│   │   └── types.ts        # Tipos TypeScript
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
├── microsservico1/
│   ├── src/
│   │   ├── index.ts        # Microsserviço 1 - Gera imagens (TypeScript)
│   │   └── types.ts        # Tipos TypeScript
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
├── microsservico2/
│   ├── src/
│   │   ├── index.ts        # Microsserviço 2 - Gera imagens (TypeScript)
│   │   └── types.ts        # Tipos TypeScript
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
- Iniciar o backend principal
- Iniciar os dois microsserviços
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
2. **Backend**: Consome mensagens das filas RabbitMQ e armazena as URLs em memória
3. **Frontend**: Faz requisições HTTP ao backend para obter e exibir as imagens

## Endpoints da API

- `GET /api/imagens` - Retorna todas as imagens
- `GET /api/imagens/:origem` - Retorna imagens de um microsserviço específico (microsservico1 ou microsservico2)
- `DELETE /api/imagens` - Limpa todas as imagens armazenadas

## Variáveis de Ambiente

No Docker Compose, as variáveis de ambiente são configuradas automaticamente. Para execução local, você pode configurar:

```bash
export RABBITMQ_URL=amqp://usuario:senha@localhost:5672
export PORT=3000
```

## Tecnologias Utilizadas

- **TypeScript**: Linguagem de programação
- **Node.js**: Runtime JavaScript
- **Express**: Framework web para a API
- **RabbitMQ**: Sistema de mensageria
- **Docker**: Containerização
- **Docker Compose**: Orquestração de containers

## Notas

- As imagens são armazenadas em memória no backend. Ao reiniciar o backend, as imagens serão perdidas.
- Os microsserviços tentam reconectar automaticamente ao RabbitMQ em caso de falha.
- O frontend possui um modo de auto-refresh que atualiza as imagens automaticamente a cada 2 segundos.
- Todos os serviços são desenvolvidos em TypeScript e compilados para JavaScript antes da execução.

## Desenvolvimento

Para desenvolvimento local com hot-reload, você pode usar `ts-node`:

```bash
# Backend
cd backend
npm run dev

# Microsserviço 1
cd microsservico1
npm run dev

# Microsserviço 2
cd microsservico2
npm run dev
```

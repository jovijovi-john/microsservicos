# Arquitetura e Funcionamento do Sistema de Microsserviços

## 📋 Visão Geral

Este projeto demonstra uma arquitetura de **microsserviços** onde dois serviços independentes geram URLs de imagens aleatórias e as enviam para um backend principal através de **filas de mensageria (RabbitMQ)**. O sistema é totalmente containerizado usando Docker e desenvolvido em TypeScript.

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│                  (index.html)                              │
│  Interface web que consome a API REST do Backend           │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
                       │ GET /api/imagens
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND                                │
│              (Express + TypeScript)                         │
│  • API REST (porta 8080)                                    │
│  • Consome mensagens do RabbitMQ                            │
│  • Armazena imagens em memória                              │
└──────┬──────────────────────────────┬───────────────────────┘
       │                              │
       │ Consome                      │ Consome
       │ Fila: imagens_microsservico1 │ Fila: imagens_microsservico2
       ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RABBITMQ                                 │
│              (Message Broker)                               │
│  • Gerencia filas de mensagens                             │
│  • Desacopla comunicação entre serviços                    │
└──────┬──────────────────────────────┬───────────────────────┘
       │                              │
       │ Publica                      │ Publica
       │ Fila: imagens_microsservico1 │ Fila: imagens_microsservico2
       ▼                              ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   MICROSSERVIÇO 1        │  │   MICROSSERVIÇO 2        │
│   (TypeScript)           │  │   (TypeScript)           │
│                           │  │                           │
│ • Gera URLs de imagens   │  │ • Gera URLs de imagens   │
│   a cada 3 segundos      │  │   a cada 4 segundos      │
│ • Tamanhos: 400x300,      │  │ • Tamanhos: 800x600,     │
│   500x400, 600x500       │  │   700x500, 900x700      │
│ • Envia para RabbitMQ    │  │ • Envia para RabbitMQ    │
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

### 4. Exposição via API REST (Backend)

O backend expõe três endpoints:

**GET /api/imagens**
- Retorna todas as imagens recebidas de ambos os microsserviços
- Resposta:
  ```json
  {
    "total": 50,
    "imagens": [
      {
        "url": "https://picsum.photos/400/300?random=1234",
        "origem": "microsservico1",
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      ...
    ]
  }
  ```

**GET /api/imagens/:origem**
- Filtra imagens por microsserviço (`microsservico1` ou `microsservico2`)
- Exemplo: `GET /api/imagens/microsservico1`
- Resposta similar, mas apenas com imagens do microsserviço especificado

**DELETE /api/imagens**
- Limpa todas as imagens armazenadas em memória
- Útil para testes e reset do sistema

### 5. Visualização (Frontend)

- Interface web em HTML/CSS/JavaScript puro
- Faz requisições HTTP ao backend
- Exibe as imagens em um grid responsivo
- Funcionalidades:
  - **Carregar Imagens**: Busca todas as imagens do backend
  - **Filtrar por Microsserviço**: Mostra apenas imagens de MS1 ou MS2
  - **Auto-refresh**: Atualiza automaticamente a cada 2 segundos
  - **Limpar Galeria**: Remove todas as imagens do backend
  - **Estatísticas**: Mostra total de imagens e contagem por microsserviço

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

### Containerização
- **Docker**: Containerização dos serviços
- **Docker Compose**: Orquestração de múltiplos containers
- **Alpine Linux**: Imagens base leves e otimizadas

### Frontend
- **HTML5**: Estrutura
- **CSS3**: Estilização moderna com gradientes e animações
- **JavaScript (Vanilla)**: Lógica do cliente sem frameworks

## 🔐 Comunicação entre Serviços

### Dentro do Docker (Rede Interna)

Todos os serviços estão na mesma rede Docker (`microsservicos-network`):

- **Backend** → RabbitMQ: `amqp://rabbitmq:5672`
- **Microsserviço 1** → RabbitMQ: `amqp://rabbitmq:5672`
- **Microsserviço 2** → RabbitMQ: `amqp://rabbitmq:5672`
- **Frontend** → Backend: `http://localhost:8080`

O nome `rabbitmq` é resolvido pelo Docker DNS interno, permitindo comunicação entre containers sem expor portas desnecessariamente.

### Portas Expostas

- **8080**: Backend API (mapeada da porta 3000 interna)
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
2. Quando RabbitMQ está saudável, **Backend** e **Microsserviços** iniciam
3. Cada microsserviço conecta ao RabbitMQ e cria sua fila
4. Backend conecta ao RabbitMQ e começa a consumir mensagens
5. Microsserviços começam a gerar e enviar imagens
6. Backend recebe e armazena as imagens
7. Frontend pode consultar a API para visualizar

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
  "total": 25,
  "imagens": [
    {
      "url": "https://picsum.photos/400/300?random=7151",
      "origem": "microsservico1",
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    {
      "url": "https://source.unsplash.com/random/800x600",
      "origem": "microsservico2",
      "timestamp": "2024-01-15T10:30:04.000Z"
    }
  ]
}
```

## ⚠️ Limitações e Considerações

1. **Armazenamento em Memória**: As imagens são armazenadas apenas em memória. Ao reiniciar o backend, todas as imagens são perdidas.

2. **Sem Persistência**: Para produção, seria necessário um banco de dados (PostgreSQL, MongoDB, etc.) para persistir as imagens.

3. **Sem Autenticação**: A API não possui autenticação/autorização. Em produção, seria necessário implementar segurança.

4. **Rate Limiting**: Não há controle de taxa de requisições. Em produção, seria necessário implementar rate limiting.

5. **Monitoramento**: Logs básicos estão implementados, mas para produção seria necessário um sistema de monitoramento mais robusto (Prometheus, Grafana, etc.).

## 🎯 Casos de Uso

Este projeto demonstra:
- Arquitetura de microsserviços
- Comunicação assíncrona via mensageria
- Desacoplamento de serviços
- Containerização com Docker
- TypeScript em projetos Node.js
- API REST com Express
- Frontend simples e funcional

É ideal para:
- Aprendizado de arquitetura de microsserviços
- Demonstração de conceitos de mensageria
- Base para projetos mais complexos
- Prototipagem rápida de sistemas distribuídos


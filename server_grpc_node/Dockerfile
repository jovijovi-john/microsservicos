FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY server_grpc_node/package*.json ./
COPY server_grpc_node/tsconfig.json ./

# Instalar dependências
RUN npm install

# Copiar arquivo proto (do contexto do docker-compose)
COPY api_grpc/image.proto ./

# Copiar código fonte
COPY server_grpc_node/src/ ./src/

# Compilar TypeScript
RUN npm run build

# Expor porta
EXPOSE 50052

# Comando para iniciar o servidor
CMD ["node", "dist/server.js"]


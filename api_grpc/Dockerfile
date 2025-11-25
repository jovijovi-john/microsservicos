FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências
RUN npm install

# Copiar arquivo proto
COPY image.proto ./

# Copiar código fonte
COPY src/ ./src/

# Compilar TypeScript
RUN npm run build

# Expor porta
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "dist/client.js"]


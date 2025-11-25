FROM node:20-alpine

WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instala dependências
RUN npm install

# Copia código fonte
COPY src ./src

# Compila TypeScript
RUN npm run build

# Comando para iniciar
CMD ["npm", "start"]


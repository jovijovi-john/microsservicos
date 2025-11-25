FROM python:3.12-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências
COPY server_grpc_python/requirements.txt ./

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar arquivo proto (do contexto do docker-compose)
COPY api_grpc/image.proto ./

# Gerar arquivos Python do proto
RUN python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. image.proto

# Copiar código do servidor
COPY server_grpc_python/server.py ./

# Expor porta
EXPOSE 50051

# Comando para iniciar o servidor
CMD ["python", "server.py"]


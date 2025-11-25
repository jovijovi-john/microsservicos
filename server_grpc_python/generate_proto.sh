#!/bin/bash
# Script para gerar os arquivos Python a partir do .proto

python -m grpc_tools.protoc -I../api_grpc --python_out=. --grpc_python_out=. ../api_grpc/image.proto


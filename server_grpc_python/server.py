import grpc
from concurrent import futures
import image_pb2
import image_pb2_grpc


class ImageServiceServicer(image_pb2_grpc.ImageServiceServicer):
    """Implementação do serviço de imagem"""
    
    def GetImage(self, request, context):
        """Retorna uma URL de imagem"""
        # URLs de exemplo - você pode personalizar isso
        image_urls = {
            "1": "https://picsum.photos/400/300?random=1",
            "2": "https://picsum.photos/400/300?random=2",
            "default": "https://picsum.photos/400/300?random=3"
        }
        
        url = image_urls.get(request.id, image_urls["default"])
        print(f"📥 Requisição recebida - ID: {request.id}, URL retornada: {url}")
        
        return image_pb2.ImageResponse(url=url)


def serve():
    """Inicia o servidor gRPC"""
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    image_pb2_grpc.add_ImageServiceServicer_to_server(
        ImageServiceServicer(), server
    )
    
    port = "50051"
    server.add_insecure_port(f"[::]:{port}")
    server.start()
    print("✅ Servidor Python gRPC iniciado com sucesso!")
    print(f"🚀 Rodando na porta {port}")
    print("📡 Aguardando requisições...\n")
    
    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        server.stop(0)


if __name__ == "__main__":
    serve()


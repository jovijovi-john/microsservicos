export interface Imagem {
  url: string;
  origem: 'microsservico1' | 'microsservico2' | 'grpc_python' | 'grpc_node';
  timestamp: string;
}

export interface ImagensResponse {
  total: number;
  imagens: Imagem[];
  imagensFila: Imagem[];
  imagensGrpc: Imagem[];
}

export interface ImagensPorOrigemResponse extends ImagensResponse {
  origem: string;
}

export interface GrpcImagesResponse {
  python: {
    url: string;
    port: number;
  };
  node: {
    url: string;
    port: number;
  };
}


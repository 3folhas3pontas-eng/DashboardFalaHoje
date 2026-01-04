
export interface NewsItem {
  id: string | number;
  titulo: string;
  subtitulo?: string;
  noticias: string | null;      // O GANCHO (Curto/Chamativo para a Home)
  conteudo_final: string | null; // A MATÉRIA (Corpo completo da notícia)
  faqs: string | null;
  imagem_url: string | null;
  fonte_url: string | null;
  created_at: string;
}

export enum FilterStatus {
  PENDING = 'Pendentes',
  READY = 'Prontas'
}

export interface GeneratedContent {
  hook: string;    // Texto para a coluna 'noticias'
  content: string; // Texto para a coluna 'conteudo_final'
  faqs: string;
}

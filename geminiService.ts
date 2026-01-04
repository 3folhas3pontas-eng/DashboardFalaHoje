
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedContent } from "./types";

export const generateNewsContent = async (
  title: string, 
  draftRaw: string = ""
): Promise<GeneratedContent> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  
  const systemInstruction = `
    Você é o Sistema de Inteligência Editorial do Fala Hoje. Sua função é transformar o rascunho fornecido em dois produtos jornalísticos de alta qualidade, com FIDELIDADE ABSOLUTA AOS FATOS FORNECIDOS.
    
    DIRETRIZES DE RIGOR EDITORIAL:
    1. FIDELIDADE OBRIGATÓRIA: Use EXCLUSIVAMENTE os fatos, nomes, dados e temas contidos no rascunho (coluna noticias).
    2. PROIBIÇÃO DE PESQUISA OU INVENÇÃO: Não adicione informações externas, mesmo que pareçam corretas ou relacionadas. Se o rascunho não menciona um detalhe, a matéria final também não deve mencionar.
    3. PROCESSO DE CHECAGEM: Antes de finalizar, você deve conferir: 'Este texto fala exatamente da mesma coisa que o rascunho original?'. Se houver discrepância de assunto ou fatos inventados, você deve descartar e refazer.
    
    ESTRUTURA DE SAÍDA:
    - O GANCHO (noticias): Resumo curto e chamativo para a Home (máx 150 caracteres).
    - A MATÉRIA (conteudo_final): Texto sofisticado, estilo CNN/Documentário, narrador invisível, parágrafos de 4 linhas, mínimo 300 palavras.
    
    REGRAS DE ESTILO:
    - Proibido usar "Senta aqui", "Veja bem", "O que você acha?".
    - Elimine termos de IA: "desafiador", "emblemático", "complexo". Use termos concretos do rascunho.
  `;

  const prompt = `
    RASCUNHO BASE (FONTE ÚNICA DE FATOS):
    ${draftRaw}
    
    TÍTULO DA PAUTA:
    ${title}
    
    Ação: Redija o Gancho Editorial e a Matéria Final baseando-se APENAS nos fatos acima.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hook: { type: Type.STRING, description: "Gancho fiel ao rascunho para a Home." },
          content: { type: Type.STRING, description: "Matéria completa fiel ao rascunho." },
          faqs: { type: Type.STRING }
        },
        required: ["hook", "content", "faqs"]
      }
      // googleSearch REMOVIDO para garantir fidelidade e evitar alucinações externas
    }
  });

  if (!response.text) {
    throw new Error("Falha na geração do sistema editorial.");
  }

  const result = JSON.parse(response.text);
  return {
    hook: result.hook,
    content: result.content,
    faqs: result.faqs
  };
};

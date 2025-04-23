declare module 'openai' {
  export interface OpenAIApi {
    chat: {
      completions: {
        create: (params: any) => Promise<any>;
      };
    };
  }

  export default class OpenAI implements OpenAIApi {
    constructor(config: { apiKey: string });
    chat: {
      completions: {
        create: (params: any) => Promise<any>;
      };
    };
  }
} 
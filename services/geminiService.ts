
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async analyzePosition(fen: string, history: string[]): Promise<string> {
    try {
      const prompt = `
        You are a World Class Chess Coach. 
        Analyze the following chess position (FEN): ${fen}
        Previous moves: ${history.join(', ')}
        
        Provide a brief analysis (max 3 sentences):
        1. Who has the advantage?
        2. What is the main strategic idea for the current player?
        3. Suggest a candidate move.
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      });

      return response.text || "I'm unable to analyze the position at this moment.";
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return "The AI coach is currently taking a break.";
    }
  }
}

export const geminiService = new GeminiService();

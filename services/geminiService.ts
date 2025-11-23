
import { GoogleGenAI } from "@google/genai";

// We remove the top-level initialization to prevent "process is not defined" crashes on app startup.
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export async function generateExpandedSummary(citation: string): Promise<string> {
  const prompt = `
    Du er en akademisk ekspert med speciale i læringsteorier. 
    Uddyb følgende kildehenvisning med en mere detaljeret analyse. 
    Bevar den eksisterende struktur (### Overordnet Resumé, ### Centrale Teorier, ### Vigtigste Pointer, ### Modeller), men giv mere dybde, tilføj praktiske eksempler, potentielle kritikpunkter og sammenlign eventuelt med andre relevante teorier.
    Sørg for, at outputtet er i Markdown-format ligesom det oprindelige resumé.

    Kilden er: "${citation}"
  `;

  try {
    // Initialize the AI client inside the function.
    // This ensures the app loads even if the environment variable is missing initially.
    // Ideally, process.env.API_KEY is replaced by the bundler at build time.
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        throw new Error("API Key mangler. Tjek dine Vercel Environment Variables.");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return response.text as string;
  } catch (error) {
    console.error("Error generating summary:", error);
    // Return a user-friendly error string or rethrow to be caught by the UI
    throw error;
  }
}

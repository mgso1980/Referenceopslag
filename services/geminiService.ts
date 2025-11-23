
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export async function generateExpandedSummary(citation: string): Promise<string> {
  const prompt = `
    Du er en akademisk ekspert med speciale i læringsteorier. 
    Uddyb følgende kildehenvisning med en mere detaljeret analyse. 
    Bevar den eksisterende struktur (### Overordnet Resumé, ### Centrale Teorier, ### Vigtigste Pointer, ### Modeller), men giv mere dybde, tilføj praktiske eksempler, potentielle kritikpunkter og sammenlign eventuelt med andre relevante teorier.
    Sørg for, at outputtet er i Markdown-format ligesom det oprindelige resumé.

    Kilden er: "${citation}"
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Could not generate summary from Gemini API.");
  }
}

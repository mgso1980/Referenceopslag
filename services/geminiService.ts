
import { GoogleGenAI } from "@google/genai";
import { SourceSummary, GroundingSource } from '../types';

const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 2000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateSourceSummary(citation: string): Promise<SourceSummary> {
  if (!process.env.API_KEY || process.env.API_KEY.trim() === '') {
    throw new Error("API-nøglen er ugyldig eller mangler. Applikationens administrator skal konfigurere en gyldig nøgle.");
  }
  
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-2.5-pro';

      const prompt = `Brug Google Search til at finde og opsummere følgende akademiske kilde på dansk.
Strukturér dit svar med følgende markdown-overskrifter:
- ### Overordnet Resumé
- ### Centrale Teorier
- ### Vigtigste Pointer
- ### Modeller

Brug punktopstillinger under hver overskrift. Hvis du ikke kan finde tilstrækkelig information, så svar venligst med en besked om, at kilden ikke kunne findes.

Kilde: "${citation}"`;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
        },
      });

      if (response.promptFeedback?.blockReason) {
          throw new Error(`Anmodningen blev blokeret af sikkerhedshensyn: ${response.promptFeedback.blockReason}`);
      }

      const rawResponse = response.text?.trim() || "";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const groundingSources: GroundingSource[] = [];

      if (groundingChunks) {
          for (const chunk of groundingChunks) {
              if (chunk.web) {
                  groundingSources.push({
                      uri: chunk.web.uri,
                      title: chunk.web.title || '',
                  });
              }
          }
      }

      if (!rawResponse) {
          return {
              rawResponse: "AI-modellen kunne desværre ikke finde et specifikt resumé for den valgte kilde.",
              groundingSources: [],
          };
      }

      return {
          rawResponse,
          groundingSources,
      };

    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message?.toLowerCase() || '';

      const isOverloaded = errorMessage.includes('overloaded') || errorMessage.includes('unavailable') || errorMessage.includes('503');
      const isRateLimited = errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('resource_exhausted');

      if ((isOverloaded || isRateLimited) && attempt < MAX_RETRIES - 1) {
        let backoffTime: number;
        let reason: string;

        if (isRateLimited) {
            reason = "rate limiting";
            const retryMatch = error.message.match(/Please retry in ([\d\.]+)s/);
            if (retryMatch && retryMatch[1]) {
                backoffTime = parseFloat(retryMatch[1]) * 1000 + (Math.random() * 500);
            } else {
                backoffTime = (INITIAL_BACKOFF_MS * Math.pow(2, attempt)) + (Math.random() * 1000);
            }
        } else {
            reason = "model overload";
            backoffTime = (INITIAL_BACKOFF_MS * Math.pow(2, attempt)) + (Math.random() * 1000);
        }
        
        console.log(`Attempt ${attempt + 1} failed due to ${reason}. Retrying in ${Math.round(backoffTime)}ms...`);
        await sleep(backoffTime);
        continue;
      }
      
      break;
    }
  }

  if (lastError) {
    throw lastError;
  }
    
  throw new Error("Der opstod en uventet fejl under generering af resumé.");
}

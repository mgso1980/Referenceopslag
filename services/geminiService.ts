import { GoogleGenAI } from "@google/genai";
import { SourceSummary, GroundingSource } from '../types';

const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 2000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateSourceSummary(citation: string): Promise<SourceSummary> {
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

      // Success, return and exit the loop
      return {
          rawResponse,
          groundingSources,
      };

    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message?.toLowerCase() || '';

      // Check for retryable errors.
      const isOverloaded = errorMessage.includes('overloaded') || errorMessage.includes('unavailable') || errorMessage.includes('503');
      const isRateLimited = errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('resource_exhausted');

      if ((isOverloaded || isRateLimited) && attempt < MAX_RETRIES - 1) {
        let backoffTime: number;
        let reason: string;

        if (isRateLimited) {
            reason = "rate limiting";
            // Use original error message for regex to preserve case
            const retryMatch = error.message.match(/Please retry in ([\d\.]+)s/);
            if (retryMatch && retryMatch[1]) {
                // Use suggested delay from API + random jitter
                backoffTime = parseFloat(retryMatch[1]) * 1000 + (Math.random() * 500);
            } else {
                 // Fallback if regex fails, though unlikely
                backoffTime = (INITIAL_BACKOFF_MS * Math.pow(2, attempt)) + (Math.random() * 1000);
            }
        } else { // isOverloaded
            reason = "model overload";
            // Exponential backoff with jitter
            backoffTime = (INITIAL_BACKOFF_MS * Math.pow(2, attempt)) + (Math.random() * 1000);
        }
        
        console.log(`Attempt ${attempt + 1} failed due to ${reason}. Retrying in ${Math.round(backoffTime)}ms...`);
        await sleep(backoffTime);
        continue; // Try again
      }
      
      // If it's not a retryable error or the last attempt, break the loop.
      break;
    }
  }

  // If we exit the loop, it means all retries failed.
  console.error(`Fatal error generating summary for citation: "${citation}" after ${MAX_RETRIES} attempts`, lastError);
    
  let userMessage = "Der opstod en teknisk fejl under generering af resumé. Prøv venligst igen.";
      
  if (lastError instanceof Error) {
      const lowerCaseMessage = lastError.message.toLowerCase();
      if (lowerCaseMessage.includes('api key not valid') || 
          lowerCaseMessage.includes('api_key_invalid') || 
          lowerCaseMessage.includes('requested entity was not found')) {
          userMessage = "Din API-nøgle er ugyldig eller har ikke de nødvendige tilladelser. Vælg venligst en gyldig nøgle.";
      } else if (lowerCaseMessage.includes('blocked')) {
          userMessage = `Anmodningen blev blokeret. Årsag: ${lastError.message}`;
      } else if (lowerCaseMessage.includes('overloaded') || lowerCaseMessage.includes('unavailable') || lowerCaseMessage.includes('503')) {
          userMessage = "AI-modellen er i øjeblikket overbelastet. Vent et øjeblik, og prøv venligst igen.";
      } else if (lowerCaseMessage.includes('quota') || lowerCaseMessage.includes('429') || lowerCaseMessage.includes('resource_exhausted')) {
          userMessage = "Du har ramt anmodningsgrænsen for din API-nøgle (typisk for gratis versioner). Vent venligst et minut, og prøv igen.";
      }
  }
      
  throw new Error(userMessage);
}
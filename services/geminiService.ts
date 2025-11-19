
import { GoogleGenAI } from "@google/genai";
import type { GroundingChunk, Business, FindBusinessesResult } from '../types';

interface UserLocation {
    latitude: number;
    longitude: number;
}

export const findBusinesses = async (
    query: string,
    location: UserLocation | null,
    model: string
): Promise<FindBusinessesResult> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const toolConfig = location ? {
        retrievalConfig: {
            latLng: {
                latitude: location.latitude,
                longitude: location.longitude,
            }
        }
    } : undefined;

    // We request JSON output in the prompt text (without forcing responseMimeType/responseSchema)
    // because using responseSchema is not supported when using the googleMaps tool for grounding.
    const prompt = `
You are a smart local business finder.

STEP 1: SEARCH
Use the Google Maps tool to find businesses matching: "${query}".
Use the Google Search tool to find extra contact details (emails) for these businesses.

STEP 2: EXTRACT
For EACH business found in the Google Maps results, create a JSON object.
- **name**: Name from Maps.
- **website**: You **MUST** extract the 'websiteUri' field provided by the Google Maps tool. If the tool has a link, you must include it. Do not mark as N/A if the map result has a link.
- **email**: Actively scan the Google Search results for the business name + "email" or "contact". Look for patterns like "info@", "contact@", "reservation@".
- **mapsLink**: The 'googleMapsUri' from Maps.
- **phone**: The 'internationalPhoneNumber' or 'formattedPhoneNumber' from Maps.
- **address**: The 'formattedAddress' from Maps.
- **rating**: 'rating' from Maps.
- **reviews**: 'userRatingCount' from Maps.
- **price**: 'priceLevel' from Maps.
- **hours**: Current open status or hours.

STEP 3: FORMAT
Return a STRICT JSON array containing ALL results.
Do not summarize. Do not filter. If Maps finds 15 places, return 15 objects.

JSON Format:
[
  {
    "name": "string",
    "category": "string",
    "address": "string",
    "phone": "string",
    "website": "string", 
    "email": "string",
    "mapsLink": "string",
    "rating": "string",
    "reviews": "string",
    "price": "string",
    "hours": "string",
    "status": "string"
  }
]

If a specific value is absolutely not found in either Maps or Search, use "N/A".
`.trim();

    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 1000;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    tools: [{ googleMaps: {} }, { googleSearch: {} }],
                    toolConfig: toolConfig
                },
            });

            let text = response.text || "";
            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

            if (!text) {
                throw new Error("API returned no content.");
            }

            // Clean up potential markdown code blocks
            text = text.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
            
            // Extract JSON array if embedded in other text
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            if (start !== -1 && end !== -1) {
                text = text.substring(start, end + 1);
            }

            let rawData: any[] = [];
            try {
                rawData = JSON.parse(text);
            } catch (e) {
                console.error("Failed to parse JSON from model response:", text);
                // If parsing fails, valid JSON wasn't returned. We might want to retry.
                if (attempt < MAX_RETRIES - 1) {
                    console.warn("Retrying due to JSON parse error...");
                    continue;
                }
                throw new Error("The AI response was not in the expected format.");
            }

            if (!Array.isArray(rawData)) {
                if (attempt < MAX_RETRIES - 1) continue;
                throw new Error("The AI response was not a list of businesses.");
            }

            // Map the English JSON keys to the Turkish keys expected by the frontend app
            const businesses: Business[] = rawData.map((item: any) => ({
                'İşletme Adı': item.name || 'N/A',
                'Kategori': item.category || 'N/A',
                'Adres': item.address || 'N/A',
                'Telefon Numarası': item.phone || 'N/A',
                'Web Sitesi': item.website || 'N/A',
                'E-posta': item.email || 'N/A',
                'Google Maps Linki': item.mapsLink || 'N/A',
                'Değerlendirme Puanı': item.rating || 'N/A',
                'Değerlendirme Sayısı': item.reviews || 'N/A',
                'Fiyat Aralığı': item.price || 'N/A',
                'Çalışma Saatleri': item.hours || 'N/A',
                'Durum': item.status || 'N/A',
            }));

            return { businesses, sources };

        } catch (error) {
            // Check if the error is a 503 "UNAVAILABLE" or 429
            if (attempt < MAX_RETRIES - 1 && error instanceof Error && (error.message.includes('UNAVAILABLE') || error.message.includes('overloaded'))) {
                const delay = INITIAL_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000; // Exponential backoff
                console.warn(`Model overloaded. Retrying in ${Math.round(delay / 1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            console.error(`Error calling Gemini API (Attempt ${attempt + 1}):`, error);
            
            if (error instanceof Error) {
                 if (error.message.includes('SAFETY')) {
                     throw new Error("The response was blocked due to safety settings. Please modify your query.");
                }
                 if (error.message.includes('UNAVAILABLE') || error.message.includes('overloaded')) {
                    throw new Error("The model is currently overloaded. Please try again later.");
                }
                // Re-throw if it's one of our custom errors (like JSON parse error)
                throw error;
            }

            throw new Error("Failed to fetch business data. An unknown error occurred.");
        }
    }
    
    throw new Error("Failed to get a valid response from the API after multiple retries.");
};

import { GoogleGenAI } from "@google/genai";
import type { GroundingChunk } from '../types';

interface FindBusinessesResult {
    csvData: string;
    sources: GroundingChunk[];
}

interface UserLocation {
    latitude: number;
    longitude: number;
}

export const findBusinesses = async (
    query: string,
    location: UserLocation | null
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

    // Combine system instructions and the user query into a single, robust prompt.
    const prompt = `
You are a highly efficient AI assistant specialized in finding local business information and formatting it as a CSV.

Your task is to take a user's query, use the provided Google Maps and Google Search tools to find relevant businesses, and then output the data STRICTLY in the following CSV format.

**OUTPUT RULES:**
1.  **CSV Only:** Your entire response must be ONLY raw CSV data. No introductory text, no summaries, no explanations.
2.  **Header Row:** The first line must be the header: "İşletme Adı","Kategori","Adres","Telefon Numarası","Web Sitesi","E-posta","Google Maps Linki","Değerlendirme Puanı","Değerlendirme Sayısı","Fiyat Aralığı","Çalışma Saatleri","Durum"
3.  **Data Columns:**
    - "İşletme Adı": The name of the business.
    - "Kategori": The business category (e.g., "Restoran", "Dişçi").
    - "Adres": The full street address.
    - "Telefon Numarası": The primary phone number.
    - "Web Sitesi": The official website URL. You MUST make a strong effort to find this using your tools.
    - "E-posta": The contact email address. You MUST make a strong effort to find this using your tools.
    - "Google Maps Linki": The direct Google Maps URL for the business. You MUST find this using the Google Maps tool.
    - "Değerlendirme Puanı": The average user rating, preferably in "X.X/5" format.
    - "Değerlendirme Sayısı": The total number of user reviews.
    - "Fiyat Aralığı": The price range (e.g., "$", "$$", "$$$").
    - "Çalışma Saatleri": The business's opening hours (e.g., "10:00-22:00").
    - "Durum": The current status (e.g., "Açık", "Kapalı").
4.  **Formatting:** Any field containing a comma must be enclosed in double quotes.
5.  **Missing Data:** If, after a thorough search with all tools, a piece of information is truly unavailable, use "N/A". Do not use it as a default.

**USER QUERY:** "${query}"
`.trim();


    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            // The combined prompt is sent as the main content.
            contents: prompt,
            config: {
                // The model has both tools available
                tools: [{ googleMaps: {} }, { googleSearch: {} }],
                toolConfig: toolConfig
            },
        });

        const csvData = response.text;
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        if (!csvData) {
            throw new Error("API returned no content. The model might have refused to answer.");
        }

        return { csvData, sources };

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error && error.message.includes('SAFETY')) {
             throw new Error("The response was blocked due to safety settings. Please modify your query.");
        }
        throw new Error("Failed to fetch business data. Please check your query or API key.");
    }
};
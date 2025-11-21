
import { GoogleGenAI } from "@google/genai";
import type { GroundingChunk, Business, FindBusinessesResult, ModelOption } from '../types';

interface UserLocation {
    latitude: number;
    longitude: number;
}

export const findBusinesses = async (
    query: string,
    location: UserLocation | null,
    modelOption: ModelOption,
    limit: number | 'all' = 'all'
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

    // --- STRATEGY SELECTION ---

    let systemInstruction = "";
    
    // Explicit mapping instructions to force the model to find the data
    const mappingInstructions = `
DATA EXTRACTION RULES (STRICT):
1. **Website**: 
   - Check the Google Maps tool output for a field called "websiteUri", "website_uri", or "website". 
   - You MUST copy this value exactly to the "website" key in your JSON. 
   - If "websiteUri" is missing in Maps, you MUST use Google Search to find the official website.
2. **Email**: 
   - Maps does NOT provide emails. You MUST use Google Search to find an email (e.g. search for "Business Name contact email"). 
   - If found, put it in the "email" key.
3. **Status**: 
   - extract "businessStatus" or "business_status" (e.g. "OPERATIONAL", "CLOSED") and map it to "status".
4. **Phone**: 
   - extract "formattedPhoneNumber", "internationalPhoneNumber", or "formatted_phone_number" and map it to "phone".
    `.trim();

    const jsonFormatInstruction = `
Output STRICT JSON format only. Do not add markdown code blocks.
The output must be a JSON array of objects with these exact keys:
[
  {
    "name": "Business Name",
    "category": "Category",
    "address": "Full Address",
    "phone": "Phone Number",
    "website": "URL or N/A",
    "email": "Email or N/A",
    "mapsLink": "Google Maps URL",
    "rating": "4.5/5",
    "reviews": "120",
    "price": "$$",
    "hours": "Open 9AM-5PM",
    "status": "Open"
  }
]
`;

    if (modelOption === 'fast') {
        // STRATEGY: SMART / SEMANTIC
        const limitText = limit === 'all' ? "20" : limit; 
        
        systemInstruction = `
You are an intelligent local guide.
Task: Find the best businesses matching: "${query}".
Goal: High quality results with COMPLETE contact info (Website and Email are priority).
Tools: Google Maps (primary), Google Search (secondary).

Instructions:
1. **SEARCH**: Execute Google Maps search for "${query}".
2. **SELECT**: Choose the top ${limitText} best matches.
3. **ENRICH (MANDATORY)**: 
   - For EVERY selected business, look for its "websiteUri" in the Maps data.
   - **CRITICAL**: If the website is missing, OR to find the Email, you MUST perform a Google Search for that specific business.
4. ${mappingInstructions}
5. ${jsonFormatInstruction}
`.trim();

    } else {
        // STRATEGY: BROAD / SCRAPER
        const isHighVolume = limit === 'all' || (typeof limit === 'number' && limit > 20);
        const volumeInstruction = isHighVolume
            ? `
   - **CRITICAL**: Google Maps tool only gives 20 results. 
   - AFTER the Maps search, you MUST use the **Google Search** tool to find "List of ${query}" or directories.
   - Extract businesses from the web search results and APPEND them to the Maps results.
   - Try to reach at least 50 results if possible.` 
            : `Retrieve exactly ${limit} results.`;
        
        systemInstruction = `
You are a raw data extraction engine.
Task: Create a comprehensive database of businesses for: "${query}".
Goal: QUANTITY and COMPLETENESS.
Tools: Google Maps, Google Search.

Instructions:
1. Execute Google Maps search for "${query}".
2. ${volumeInstruction}
3. **Do not filter** by rating. Include every single valid business found.
4. ${mappingInstructions}
5. ${jsonFormatInstruction}
`.trim();
    }

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt} (${modelOption}): Sending request to Gemini...`);
            
            // Create the promise for the API call
            const apiCall = ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    { role: 'user', parts: [{ text: systemInstruction }] }
                ],
                config: {
                    tools: [
                        { googleMaps: {} },
                        { googleSearch: {} }
                    ],
                    toolConfig: toolConfig,
                    // We cannot use responseSchema with Google Maps tool, so we rely on the prompt.
                }
            });

            // 240s (4 minutes) timeout for deep/broad searches to allow for enrichment and scraping
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error("Request timed out")), 240000)
            );

            const result = await Promise.race([apiCall, timeoutPromise]);
            
            // In the new @google/genai SDK, 'text' is a getter on the response object directly,
            // not a method on a nested 'response' property.
            const text = result.text || "";
            console.log("Raw Response Text (First 500 chars):", text.substring(0, 500));

            // 1. Clean Markdown
            let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            // 2. Extract JSON Array if buried in text
            const start = jsonStr.indexOf('[');
            const end = jsonStr.lastIndexOf(']');
            if (start !== -1 && end !== -1 && end > start) {
                jsonStr = jsonStr.substring(start, end + 1);
            }

            let rawData: any;
            try {
                rawData = JSON.parse(jsonStr);
            } catch (e) {
                console.error("JSON Parse Error:", e);
                throw new Error("Failed to parse JSON response from AI.");
            }

            if (!Array.isArray(rawData)) {
                // Handle case where AI returns a wrapper object like { "businesses": [...] }
                const keys = Object.keys(rawData);
                const arrayKey = keys.find(k => Array.isArray(rawData[k]));
                if (arrayKey) {
                    rawData = rawData[arrayKey];
                } else {
                    // Fallback: wrap single object in array
                    rawData = [rawData];
                }
            }

            // 3. Robust Parsing with Case-Insensitive Key Lookup
            const businesses: Business[] = rawData.map((item: any) => {
                
                // Helper: Find a value in 'item' by checking a list of potential keys (case-insensitive)
                const getVal = (potentialKeys: string[]): string => {
                    const itemKeys = Object.keys(item);
                    
                    // 1. Try exact matches first
                    for (const key of potentialKeys) {
                        if (item[key] !== undefined && item[key] !== null && item[key] !== 'null' && item[key] !== 'N/A') {
                            return String(item[key]);
                        }
                    }

                    // 2. Try case-insensitive matches
                    const lowerPotentialKeys = potentialKeys.map(k => k.toLowerCase());
                    for (const itemKey of itemKeys) {
                        if (lowerPotentialKeys.includes(itemKey.toLowerCase())) {
                            const val = item[itemKey];
                            if (val !== undefined && val !== null && val !== 'null' && val !== 'N/A') {
                                return String(val);
                            }
                        }
                    }
                    
                    return 'N/A';
                };

                return {
                    'Business Name': getVal(['name', 'businessName', 'business_name', 'title']),
                    'Category': getVal(['category', 'type']),
                    'Address': getVal(['address', 'formattedAddress', 'formatted_address', 'fullAddress']),
                    'Phone': getVal(['phone', 'phoneNumber', 'formattedPhoneNumber', 'formatted_phone_number', 'internationalPhoneNumber', 'tel']),
                    'Website': getVal(['website', 'websiteUri', 'website_uri', 'url', 'link', 'homepage']),
                    'Email': getVal(['email', 'mail', 'contactEmail', 'contact_email']),
                    'Google Maps Link': getVal(['mapsLink', 'googleMapsUri', 'google_maps_uri', 'mapUrl', 'uri']),
                    'Rating': getVal(['rating', 'stars', 'score']),
                    'Review Count': getVal(['reviews', 'reviewCount', 'review_count', 'numberOfReviews']),
                    'Price Range': getVal(['price', 'priceRange', 'price_range', 'priceLevel']),
                    'Hours': getVal(['hours', 'openingHours', 'opening_hours', 'regularOpeningHours']),
                    'Status': getVal(['status', 'businessStatus', 'business_status', 'operationalStatus'])
                };
            });

            // Extract grounding sources
            // In the new @google/genai SDK, candidates are directly on the response object.
            const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            const sources: GroundingChunk[] = chunks.map((c: any) => ({
                maps: c.web ? undefined : { // prioritizing proper separation if possible, but Gemini mixes them often
                    uri: c.web?.uri || c.entity?.id, // Fallback often needed
                    title: c.web?.title || c.entity?.name
                },
                web: c.web
            }));
            
            // Grounding chunks specifically for Maps usually come in a specific format or just as Web chunks in recent versions
            // We'll just pass them through and let the UI filter valid URIs.

            return { businesses, sources: chunks };

        } catch (e: any) {
            console.error(`Attempt ${attempt} failed:`, e);
            lastError = e;
            if (e.message.includes("timed out")) {
                // If it's a timeout, we might want to stop immediately or try once more depending on logic.
                // For now, we let the loop continue if retries left.
            }
        }
    }

    throw lastError || new Error("Failed to fetch businesses after multiple attempts.");
};

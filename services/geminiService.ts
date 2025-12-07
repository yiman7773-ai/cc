import { GoogleGenAI, Type } from "@google/genai";
import { VisualConfig, VisualShape } from "../types";

// Always use process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSongMood = async (songName: string, artistName: string = "Unknown Artist"): Promise<VisualConfig | null> => {
    const modelId = "gemini-2.5-flash";
    
    // We want the AI to design the "Soul" of the visualizer for this track
    // The shape provided here is just the STARTING shape, the visualizer will morph from there.
    const prompt = `
    Analyze the song "${songName}" by "${artistName}".
    Design a unique "Visual Identity" for a 3D particle system music visualizer.
    
    1. Select a starting mathematical shape that best fits the intro of the song.
    2. Create a color palette (3 colors) that matches the emotion (e.g., deep blues for sadness, neon for energetic).
    3. Determine the 'Chaos Level' (0.0=Ordered/Geometric, 1.0=Explosive/Entropy).
    4. Determine the 'Speed' multiplier (0.5=Slow/Ambient, 2.5=Fast/Techno).
    5. Write a poetic 5-10 word description of the visual mood.
    
    Available Shapes: ${Object.values(VisualShape).join(', ')}
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        shape: { type: Type.STRING, enum: Object.values(VisualShape) },
                        colors: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "3 hex color codes"
                        },
                        speed: { type: Type.NUMBER },
                        chaos: { type: Type.NUMBER },
                        description: { type: Type.STRING }
                    },
                    required: ["shape", "colors", "speed", "chaos", "description"]
                }
            }
        });

        const text = response.text;
        if (!text) return null;
        
        const data = JSON.parse(text);
        
        // Ensure colors has 3 items
        const colors = (data.colors && data.colors.length >= 3) 
            ? [data.colors[0], data.colors[1], data.colors[2]] 
            : ["#ffffff", "#888888", "#000000"];

        return {
            shape: data.shape as VisualShape,
            colors: colors as [string, string, string],
            speed: data.speed || 1,
            chaos: data.chaos || 0.5,
            description: data.description || "Cosmic energy"
        };

    } catch (error) {
        console.error("Gemini analysis failed:", error);
        return null;
    }
};
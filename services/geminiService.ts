
import { GoogleGenAI } from "@google/genai";

export const generatePostContent = async (title: string, currentContent: string = ""): Promise<string> => {
  // Always use a named parameter and obtain the API key directly from process.env.API_KEY as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Determine context based on whether we are starting fresh or continuing
  const prompt = currentContent.trim().length === 0
    ? `Jsi zkušený redaktor a spisovatel. Napiš poutavý, dobře strukturovaný článek v českém jazyce na téma: "${title}". Článek by měl mít úvod, hlavní stať a závěr. Nepoužívej Markdown formátování (jako # nebo *), piš pouze čistý text oddělený odstavci.`
    : `Jsi zkušený redaktor. Pokračuj v psaní následujícího textu (nebo jej rozviň), téma je "${title}". Zde je dosavadní text: "${currentContent}". Plynule navaž a rozviň myšlenku. Nepoužívej Markdown.`;

  try {
    // Using gemini-3-flash-preview for basic text tasks like post generation.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Access .text property directly.
    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

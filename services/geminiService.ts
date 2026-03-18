import { GoogleGenAI, Type } from "@google/genai";
import { ExpenseCategory } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// We assume process.env.API_KEY is pre-configured and accessible.
// Helper to get env variable safely in both dev and production
const getEnv = (key: string) => {
  // Vite uses import.meta.env for client-side variables
  // @ts-ignore
  const viteEnv = import.meta.env?.[key];
  if (viteEnv) return viteEnv;

  // Fallback for other environments
  try {
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
    }
  } catch (e) {}
  
  return '';
};

// Check for multiple possible keys: VITE_GEMINI_API_KEY (Vercel) or GEMINI_API_KEY (AI Studio)
const apiKey = getEnv("VITE_GEMINI_API_KEY") || getEnv("GEMINI_API_KEY");
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const categorizeExpense = async (description: string): Promise<ExpenseCategory> => {
  if (!ai || !apiKey) {
    console.warn("Gemini API Key missing. Please set VITE_GEMINI_API_KEY in Vercel settings.");
    return ExpenseCategory.Other;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Categorize the following expense description into one of these exact categories: "餐饮", "住宿", "出行", "游览", "购物", "娱乐", "其他". Description: "${description}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              enum: [
                "餐饮", "住宿", "出行", "游览", "购物", "娱乐", "其他"
              ]
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return ExpenseCategory.Other;

    const data = JSON.parse(jsonText);
    return data.category as ExpenseCategory;

  } catch (error) {
    console.error("Gemini classification failed:", error);
    return ExpenseCategory.Other;
  }
};
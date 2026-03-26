import { GoogleGenAI, Type } from "@google/genai";
import { ExpenseCategory } from "../types";

// The API key must be obtained exclusively from the environment variable.
// In Vite, we must use static access for environment variables to be correctly replaced during build.
const getApiKey = () => {
  // 1. Check for Vite-prefixed key (Standard for Vercel/Vite deployments)
  // @ts-ignore
  const viteKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (viteKey) return viteKey;

  // 2. Check for AI Studio provided keys (AI Studio environment)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined') {
      // @ts-ignore
      return process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    }
  } catch (e) {}
  
  return '';
};

const apiKey = getApiKey();
if (!apiKey) {
  console.warn("⚠️ Gemini API Key is missing. AI features will be disabled. Please set VITE_GEMINI_API_KEY in your environment.");
}
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const categorizeExpense = async (description: string): Promise<ExpenseCategory> => {
  if (!ai || !apiKey) {
    return ExpenseCategory.Other;
  }

  try {
    console.log(`🤖 AI Categorizing: "${description}"...`);
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
    if (!jsonText) {
      console.warn("🤖 AI returned empty response");
      return ExpenseCategory.Other;
    }

    const data = JSON.parse(jsonText);
    console.log(`✅ AI Categorized as: ${data.category}`);
    return data.category as ExpenseCategory;

  } catch (error) {
    console.error("❌ Gemini classification failed:", error);
    return ExpenseCategory.Other;
  }
};

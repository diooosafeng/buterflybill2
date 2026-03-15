import { GoogleGenAI, Type } from "@google/genai";
import { ExpenseCategory } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// We assume process.env.API_KEY is pre-configured and accessible.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const categorizeExpense = async (description: string): Promise<ExpenseCategory> => {
  if (!process.env.API_KEY) {
    console.warn("API Key missing, defaulting to Other. Please set API_KEY in your environment.");
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
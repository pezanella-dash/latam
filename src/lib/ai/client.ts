import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY not set");

export const genAI = new GoogleGenerativeAI(apiKey);

// gemini-2.5-flash: fast, free tier, great for PT-BR
export const MODEL = "gemini-2.5-flash";

export function getModel() {
  return genAI.getGenerativeModel({ model: MODEL });
}

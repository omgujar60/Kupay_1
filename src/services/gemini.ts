import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface SpendingSummary {
  total: number;
  categories: { name: string; amount: number }[];
}

export async function getFinancialAdvice(query: string, summary: SpendingSummary) {
  const prompt = `
    You are Kupay AI, a financial coach for Indian families.
    Context:
    - User Query: ${query}
    - Total Family Spending: ₹${summary.total}
    - Category Breakdown: ${summary.categories.map(c => `${c.name}: ₹${c.amount}`).join(', ')}

    Rules:
    - Explain finance in simple Indian context (use metaphors like "dining table conversation").
    - NO investment advice or stock recommendations.
    - If asked for stocks, explain how to evaluate investments rather than picking ones.
    - Be encouraging and family-centric.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text;
}

export interface SMSParsedData {
  amount: number;
  merchant: string;
  category: string;
  isCredit: boolean;
}

export async function parseSMS(text: string): Promise<SMSParsedData> {
  const prompt = `
    Extract spending details from an Indian banking/transaction SMS.
    SMS: "${text}"

    Rules:
    - "amount": Extract only the transaction amount as a number.
    - "merchant": Infer the merchant name (e.g., "Zomato", "Amazon", "Uber"). If it's a peer-to-peer transfer, use the recipient's name or "P2P Transfer".
    - "isCredit": True if the SMS describes money coming IN (salary, refund, received from someone). False if it's money going OUT (spent, paid, debited).
    - "category": Classify into one of these EXACT values:
      "Transfers", "Food & Dining", "Grocery", "Essential", "Services", "Shopping & Lifestyle", "Travel & Transport", "Health & Wellness", "Education", "Entertainment", "Home & Living", "Miscellaneous"
    
    Format: Return ONLY a JSON object matching the schema.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER },
          merchant: { type: Type.STRING },
          isCredit: { type: Type.BOOLEAN },
          category: { 
            type: Type.STRING, 
            enum: [
              "Transfers", "Food & Dining", "Grocery", "Essential", "Services", 
              "Shopping & Lifestyle", "Travel & Transport", "Health & Wellness", 
              "Education", "Entertainment", "Home & Living", "Miscellaneous"
            ] 
          }
        },
        required: ["amount", "merchant", "category", "isCredit"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

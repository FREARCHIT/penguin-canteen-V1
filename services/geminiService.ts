import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedRecipeResponse } from "../types";

// 厨师人格 Prompt
const CHEF_SYSTEM_INSTRUCTION = `你是一位专业的大厨。请根据用户的需求，生成结构化的菜谱。
要求：
1. 语言必须使用简体中文。
2. 分类必须是：早餐、正餐、小食/甜点、饮品、其他 之一。
3. 标签要简短有力，如：'快手'、'减脂'、'下饭'。
4. 所有的计量单位要清晰。`;

export const generateRecipeFromIdea = async (idea: string): Promise<GeneratedRecipeResponse | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  try {
    // 每次调用重新实例化，解决某些移动端环境下的作用域问题
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: idea,
      config: {
        systemInstruction: CHEF_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.STRING },
                },
                required: ["name", "amount"]
              }
            },
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "description", "category", "ingredients", "steps"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as GeneratedRecipeResponse;
  } catch (error) {
    console.error("Gemini generation error:", error);
    throw error;
  }
};

export const parseRecipeFromText = async (text: string): Promise<GeneratedRecipeResponse | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `请从以下文本中提取菜谱信息：\n\n${text}`,
      config: {
        systemInstruction: "你是一个精准的数据提取助手。如果原文本信息缺失，请根据常识推断补充。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.STRING },
                }
              }
            },
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const jsonStr = response.text;
    return jsonStr ? JSON.parse(jsonStr) : null;
  } catch (error) {
    console.error("Gemini parsing error:", error);
    throw error;
  }
};
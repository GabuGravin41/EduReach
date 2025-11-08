import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { QuizQuestion } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const quizSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: {
        type: Type.STRING,
        description: 'The question being asked.'
      },
      options: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING
        },
        description: 'An array of 4 possible answers.'
      },
      correctAnswer: {
        type: Type.STRING,
        description: 'The correct answer, which must be one of the provided options.'
      }
    },
    required: ['question', 'options', 'correctAnswer']
  }
};

export type QuestionType = 'multiple-choice' | 'essay' | 'short-answer';

const getQuestionSchema = (questionType: QuestionType) => {
    switch (questionType) {
        case 'essay':
            return {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: 'An open-ended question that requires a detailed, written response.' },
                },
                required: ['question']
            };
        case 'short-answer':
            return {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: 'A question that requires a specific, concise answer.' },
                    correctAnswer: { type: Type.STRING, description: 'The correct answer for the question.' },
                },
                required: ['question', 'correctAnswer']
            };
        case 'multiple-choice':
        default:
            return {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: 'The question being asked.' },
                    options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'An array of 4 possible answers.'
                    },
                    correctAnswer: {
                        type: Type.STRING,
                        description: 'The correct answer, which must be one of the provided options.'
                    }
                },
                required: ['question', 'options', 'correctAnswer']
            };
    }
};

export const generateAssessmentFromSource = async (
    sourceText: string,
    topic: string,
    numQuestions: number,
    questionType: QuestionType
): Promise<{ title: string; description: string; questions: any[] }> => {
    const model = 'gemini-2.5-flash';

    const questionSchema = getQuestionSchema(questionType);

    const assessmentSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: `A suitable title for a quiz on the topic of "${topic}".` },
            description: { type: Type.STRING, description: 'A brief, one-sentence description of what this quiz covers.' },
            questions: {
                type: Type.ARRAY,
                items: questionSchema
            }
        },
        required: ['title', 'description', 'questions']
    };

    const prompt = `You are an expert educator. Based on the provided source text about "${topic}", create an assessment with exactly ${numQuestions} questions of the type "${questionType}". The assessment must test a user's understanding of the main topics in the text. Ensure the output is a valid JSON object matching the provided schema.

Source Text:
---
${sourceText}
---
`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: assessmentSchema,
            }
        });
        
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error generating assessment:", error);
        throw new Error("Failed to generate assessment from source text.");
    }
};


export const generateQuiz = async (transcript: string): Promise<QuizQuestion[]> => {
  const model = 'gemini-2.5-flash';

  const prompt = `You are an expert educator. Based on the following video transcript, create a multiple-choice quiz with 5 questions to test a user's understanding. The questions should cover the main topics of the video. Ensure the output is a valid JSON array matching the provided schema.

Transcript:
---
${transcript}
---
`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
      }
    });

    const jsonString = response.text.trim();
    const quizData = JSON.parse(jsonString);
    return quizData;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz from transcript.");
  }
};


export const createChat = (transcript: string): Chat => {
    const model = 'gemini-2.5-flash';
    const chat = ai.chats.create({
        model: model,
        config: {
            systemInstruction: `You are an AI learning assistant named Edu. Your role is to help a user understand the provided video transcript. You must answer their questions clearly and concisely, based *only* on the information in the transcript. If a question cannot be answered from the transcript, state that the information is not available in the video content. The transcript is as follows:\n\n---\n${transcript}\n---`,
        },
    });
    return chat;
};

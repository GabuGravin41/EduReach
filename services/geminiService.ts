
import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { QuizQuestion, AssessmentMode } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const cleanJsonString = (str: string) => {
    // Remove markdown code blocks if present
    return str.replace(/```json|```/g, '').trim();
};

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
                    question: { type: Type.STRING, description: 'The rigorous problem statement or proof requirement.' },
                    model_solution: { 
                        type: Type.STRING, 
                        description: 'A detailed step-by-step model solution, mathematical proof, or key arguments required for full marks. This will be hidden from the student until grading.' 
                    },
                    rubric_criteria: {
                        type: Type.ARRAY,
                        description: 'A list of 2-3 specific criteria for grading.',
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                max_points: { type: Type.NUMBER }
                            },
                            required: ['name', 'description', 'max_points']
                        }
                    }
                },
                required: ['question', 'model_solution']
            };
        case 'short-answer':
            return {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: 'The specific problem to solve.' },
                    correctAnswer: { type: Type.STRING, description: 'The final answer (e.g. numerical value or short phrase).' },
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
    questionType: QuestionType,
    mode: AssessmentMode = 'quiz'
): Promise<{ title: string; description: string; questions: any[] }> => {
    const model = 'gemini-2.5-flash';

    const questionSchema = getQuestionSchema(questionType);

    const assessmentSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: `A suitable title for the ${mode}.` },
            description: { type: Type.STRING, description: `A brief description of this ${mode}.` },
            questions: {
                type: Type.ARRAY,
                items: questionSchema
            }
        },
        required: ['title', 'description', 'questions']
    };

    let systemInstruction = "";
    let prompt = "";

    if (mode === 'exam') {
        systemInstruction = "You are a strict academic examiner. You create rigorous, high-level exams. You prioritize problem-solving, proofs, and application over definitions. You are knowledgeable about competitive standards like IMO, Putnam, and Graduate Qualifying Exams.";
        
        prompt = `Based on the provided context (or general knowledge if the context implies a specific difficulty like 'IMO'), create a RIGOROUS EXAM about "${topic}".
        
        CRITICAL INSTRUCTIONS FOR 'EXAM' MODE:
        1. Do NOT ask for definitions or simple explanations.
        2. Create ${numQuestions} questions of type "${questionType}".
        3. If the user mentions "IMO", "Putnam", or "Olympiad", retrieve or adapt REAL, CLASSIC PROBLEMS from these competitions if possible, or create new ones that match that exact difficulty and style.
        4. For 'essay' type questions:
           - Ask for PROOFS or multi-step derivations if the topic is Math/Physics.
           - Ask for critical analysis if the topic is Humanities.
           - YOU MUST PROVIDE A 'MODEL SOLUTION' field containing the rigorous proof or ideal argument. This is hidden from the user but used for AI grading.
        5. ensure mathematical validity.
        
        Context/Notes:
        ---
        ${sourceText}
        ---`;
    } else {
        // Quiz Mode (Default)
        systemInstruction = "You are a helpful tutor. You create quizzes to check for conceptual understanding and basic retention.";
        
        prompt = `Based on the provided source text about "${topic}", create a quiz with exactly ${numQuestions} questions of the type "${questionType}". 
        The questions should test understanding of the main ideas.
        
        Source Text:
        ---
        ${sourceText}
        ---`;
    }

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: assessmentSchema,
            }
        });
        
        const jsonString = cleanJsonString(response.text);
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error generating assessment:", error);
        throw new Error("Failed to generate assessment from source text.");
    }
};

export const gradeEssayQuestion = async (
    question: string, 
    studentAnswer: string, 
    modelSolution: string, 
    rubric?: any[]
): Promise<{ score: number; feedback: string }> => {
    const model = 'gemini-2.5-flash';
    
    const rubricText = rubric 
        ? JSON.stringify(rubric) 
        : "Grade based on logical correctness, completeness, and clarity.";

    const prompt = `You are an expert professor grading an exam.
    
    Question: ${question}
    
    Model Solution / Source of Truth:
    ${modelSolution}
    
    Rubric Criteria:
    ${rubricText}
    
    Student Answer:
    ${studentAnswer}
    
    Task:
    1. Compare the Student Answer strictly against the Model Solution and Rubric.
    2. If the subject is Math/Science, check for logical validity of the proof/steps. Minor calculation errors are less penalizing than logical fallacies.
    3. If the subject is Humanities, evaluate the strength of the argument and coverage of key concepts.
    4. Provide a Score (0-100) and concise Feedback explaining the score.
    
    Output Format (JSON):
    {
      "score": number,
      "feedback": "string"
    }`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER },
                        feedback: { type: Type.STRING }
                    },
                    required: ['score', 'feedback']
                }
            }
        });
        
        const jsonString = cleanJsonString(response.text);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error grading essay:", error);
        return { score: 0, feedback: "Error grading submission. Please try again." };
    }
};

export const generateQuiz = async (transcript: string): Promise<QuizQuestion[]> => {
  const model = 'gemini-2.5-flash';

  // Truncate transcript if excessively long to prevent token errors before we even get to the model
  const effectiveTranscript = transcript.length > 50000 ? transcript.substring(0, 50000) + "...(truncated)" : transcript;

  const prompt = `You are an expert educator. Based on the following video transcript, create a multiple-choice quiz with 5 questions to test a user's understanding. The questions should cover the main topics of the video. Ensure the output is a valid JSON array matching the provided schema.

Transcript:
---
${effectiveTranscript}
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

    const jsonString = cleanJsonString(response.text);
    const quizData = JSON.parse(jsonString);
    return quizData;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz from transcript.");
  }
};

export const generateResponseWithContext = async (message: string, context: string): Promise<string> => {
    const model = 'gemini-2.5-flash';
    
    const prompt = `You are Edu, an AI learning assistant. Answer the user's question based ONLY on the provided context below.
    
Context:
---
${context}
---

User Question: ${message}

Answer:`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        return response.text || "I couldn't generate a response.";
    } catch (error) {
        console.error("Chat error:", error);
        return "I'm having trouble processing that request right now.";
    }
};

// Deprecated in favor of stateless generation for long transcripts, but kept for compatibility
export const createChat = (transcript: string): Chat => {
    const model = 'gemini-2.5-flash';
    const chat = ai.chats.create({
        model: model,
        config: {
            systemInstruction: `You are an AI learning assistant named Edu. Your role is to help a user understand the provided video transcript. You must answer their questions clearly and concisely, based *only* on the information in the transcript. If a question cannot be answered from the transcript, state that the information is not available in the video content. The transcript is as follows:\n\n---\n${transcript.substring(0, 30000)}\n---`,
        },
    });
    return chat;
};

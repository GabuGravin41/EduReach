from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import google.generativeai as genai
import json
import traceback


def configure_gemini():
    """Configure Gemini API with the API key from settings."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in settings")
    print(f"Using API key: {settings.GEMINI_API_KEY[:5]}...{settings.GEMINI_API_KEY[-5:]}")
    print(f"Using model: {getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-2.5-flash')}")
    genai.configure(api_key=settings.GEMINI_API_KEY)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat(request):
    """
    Handle chat messages with Gemini API.
    
    Expected request body:
    {
        "message": "string",
        "context": "string" (optional, for providing additional context)
    }
    """
    try:
        # Get request data
        message = request.data.get('message', '')
        context = request.data.get('context', '')
        
        print(f"Chat request received. Message length: {len(message)}, Context length: {len(context)}")
        
        if not message:
            return Response(
                {'error': 'Message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Configure Gemini
        configure_gemini()
        
        # Create the model
        model_name = getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-2.5-flash')
        print(f"Creating model with name: {model_name}")
        model = genai.GenerativeModel(model_name)
        
        # Construct the full prompt with context
        full_prompt = f"{context}\n\n{message}" if context else message
        print(f"Prompt prepared. Length: {len(full_prompt)}")
        
        # Generate content
        print("Calling Gemini API...")
        response = model.generate_content(full_prompt)
        print(f"Response received. Length: {len(response.text)}")
        
        return Response(
            {'response': response.text},
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR in chat endpoint: {str(e)}")
        print(f"Traceback: {error_details}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_quiz(request):
    """
    Generate a quiz from transcript using Gemini API.
    
    Expected request body:
    {
        "transcript": "string",
        "num_questions": int (optional, default: 5),
        "difficulty": "easy|medium|hard" (optional, default: "medium")
    }
    """
    try:
        # Get request data
        transcript = request.data.get('transcript', '')
        num_questions = request.data.get('num_questions', 5)
        difficulty = request.data.get('difficulty', 'medium')
        
        print(f"Quiz request received. Transcript length: {len(transcript)}, Questions: {num_questions}, Difficulty: {difficulty}")
        
        if not transcript:
            return Response(
                {'error': 'Transcript is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Configure Gemini
        configure_gemini()
        
        # Create the model
        model_name = getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-2.5-flash')
        print(f"Creating model with name: {model_name}")
        model = genai.GenerativeModel(model_name)
        
        # Construct the prompt
        prompt = f"""
        Based on the following transcript, generate {num_questions} {difficulty} difficulty quiz questions.
        
        Transcript:
        {transcript}
        
        Please generate questions in the following JSON format:
        {{
            "questions": [
                {{
                    "question": "Question text here?",
                    "type": "mcq",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": "Option A",
                    "explanation": "Brief explanation of why this is correct"
                }}
            ]
        }}
        
        Ensure the questions are relevant to the transcript content and test understanding of key concepts.
        """
        
        print(f"Prompt prepared. Length: {len(prompt)}")
        
        # Generate content
        print("Calling Gemini API...")
        response = model.generate_content(prompt)
        print(f"Response received. Length: {len(response.text)}")
        
        # Try to parse the response as JSON
        try:
            # Extract JSON from response
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            print(f"Parsing JSON response. Length: {len(response_text)}")
            quiz_data = json.loads(response_text)
            
            return Response(quiz_data, status=status.HTTP_200_OK)
        except json.JSONDecodeError as json_err:
            # If JSON parsing fails, return the raw response
            print(f"JSON parsing error: {str(json_err)}")
            return Response(
                {'raw_response': response.text},
                status=status.HTTP_200_OK
            )
    
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR in generate_quiz endpoint: {str(e)}")
        print(f"Traceback: {error_details}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

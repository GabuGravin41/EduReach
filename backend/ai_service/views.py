from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import google.generativeai as genai
import json


def configure_gemini():
    """Configure Gemini API with the API key from settings."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in settings")
    genai.configure(api_key=settings.GEMINI_API_KEY)


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
        
        if not transcript:
            return Response(
                {'error': 'Transcript is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Configure Gemini
        configure_gemini()
        
        # Create the model
        model = genai.GenerativeModel(getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-1.5-flash'))
        
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
        
        # Generate content
        response = model.generate_content(prompt)
        
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
            quiz_data = json.loads(response_text)
            
            return Response(quiz_data, status=status.HTTP_200_OK)
        except json.JSONDecodeError:
            # If JSON parsing fails, return the raw response
            return Response(
                {'raw_response': response.text},
                status=status.HTTP_200_OK
            )
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


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
        
        if not message:
            return Response(
                {'error': 'Message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Configure Gemini
        configure_gemini()
        
        # Create the model
        model = genai.GenerativeModel(getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-1.5-flash'))
        
        # Construct the full prompt with context
        full_prompt = f"{context}\n\n{message}" if context else message
        
        # Generate content
        response = model.generate_content(full_prompt)
        
        return Response(
            {'response': response.text},
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_study_plan(request):
    """
    Generate a personalized study plan using Gemini API.
    
    Expected request body:
    {
        "topic": "string",
        "duration_weeks": int,
        "skill_level": "beginner|intermediate|advanced",
        "goals": "string" (optional)
    }
    """
    try:
        # Get request data
        topic = request.data.get('topic', '')
        duration_weeks = request.data.get('duration_weeks', 4)
        skill_level = request.data.get('skill_level', 'beginner')
        goals = request.data.get('goals', '')
        
        if not topic:
            return Response(
                {'error': 'Topic is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Configure Gemini
        configure_gemini()
        
        # Create the model
        model = genai.GenerativeModel(getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-1.5-flash'))
        
        # Construct the prompt
        prompt = f"""
        Create a detailed {duration_weeks}-week study plan for learning {topic}.
        
        Student's skill level: {skill_level}
        {f"Learning goals: {goals}" if goals else ""}
        
        Please structure the study plan with:
        1. Weekly breakdown of topics to cover
        2. Recommended resources (books, videos, tutorials)
        3. Practice exercises for each week
        4. Milestones and checkpoints
        5. Estimated time commitment per week
        
        Format the response in a clear, concise, structured way that's easy to follow.
        """
        
        # Generate content
        response = model.generate_content(prompt)
        
        return Response(
            {'study_plan': response.text},
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def explain_concept(request):
    """
    Get a detailed explanation of a concept using Gemini API.
    
    Expected request body:
    {
        "concept": "string",
        "detail_level": "simple|detailed|technical" (optional, default: "detailed")
    }
    """
    try:
        # Get request data
        concept = request.data.get('concept', '')
        detail_level = request.data.get('detail_level', 'detailed')
        
        if not concept:
            return Response(
                {'error': 'Concept is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Configure Gemini
        configure_gemini()
        
        # Create the model
        model = genai.GenerativeModel(getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-1.5-flash'))
        
        # Construct the prompt based on detail level
        level_instructions = {
            'simple': 'Explain this concept in simple terms that a beginner can understand, using everyday analogies.',
            'detailed': 'Provide a comprehensive explanation with examples and use cases.',
            'technical': 'Give a technical, in-depth explanation with precise definitions and advanced details.'
        }
        
        prompt = f"""
        {level_instructions.get(detail_level, level_instructions['detailed'])}
        
        Concept: {concept}
        
        Please include:
        1. Clear definition
        2. Key points and characteristics
        3. Practical examples
        4. Common misconceptions (if any)
        5. Related concepts
        """
        
        # Generate content
        response = model.generate_content(prompt)
        
        return Response(
            {'explanation': response.text},
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

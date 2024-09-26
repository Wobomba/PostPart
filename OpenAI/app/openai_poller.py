import openai
from app.config import Config

# Set OpenAI API key
openai.api_key = Config.OPENAI_API_KEY

def fetch_questions(prompt):
    try:
        # Use the correct API method and handle responses properly
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",  # or "gpt-3.5-turbo" if using GPT-3.5
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000
        )
        # Adjust this line based on actual response structure
        return response.choices[0].message['content']
    except Exception as e:
        print(f"Error fetching questions: {e}")
        return None
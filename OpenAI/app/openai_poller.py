import openai
from app import db
from app.models import QuestionBank
import json

def fetch_questions(prompt):
    try:
        # Make a request to OpenAI
        response = openai.ChatCompletion.create(
            model="gpt-4o",  
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500
        )

        # Parse the OpenAI response
        questions_text = response.choices[0].message['content']
        start_index = questions_text.find('[')
        end_index = questions_text.rfind(']') + 1
        json_text = questions_text[start_index:end_index]
        questions = json.loads(json_text)

        # Fetch the last question ID in the database
        last_question = QuestionBank.query.order_by(QuestionBank.question_id.desc()).first()
        last_id_num = int(last_question.question_id[1:]) if last_question else 0

        # Save questions to the database
        for i, q in enumerate(questions, start=1):
            new_question_id = f"Q{last_id_num + i:03d}"  # Generate a new ID
            existing_question = QuestionBank.query.filter_by(question=q['Question']).first()

            if existing_question:
                print(f"DEBUG: Question '{q['Question']}' already exists, skipping.")
                continue

            new_question = QuestionBank(
                question_id=new_question_id,
                question=q['Question'],
                answers=json.dumps(q['Answers']),
                correct_answer=q['Correct_answer'],
                passing_score=q['Passing_score'],
                failing_score=q['Failing_score'],
                difficulty_level=q['Difficulty_level'],
                department=q['Department']
            )
            db.session.add(new_question)

        db.session.commit()
        print(f"DEBUG: Fetched and saved {len(questions)} questions.")
        return questions

    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse JSON: {e}")
        return None
    except Exception as e:
        print(f"ERROR: OpenAI API or database issue: {e}")
        return None

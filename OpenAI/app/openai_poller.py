import openai
from app.config import Config

from app.models import QuestionBank
from app import db

openai.api_key = Config.OPENAI_API_KEY

def fetch_questions(prompt):
    response = openai.Completion.create(
        engine="gpt-4", #specifying the engine used in the playground tests
        prompt=prompt, #prompt used in the playground
        max_tokens=1000 #number of tokens used
    )
    return response.choices[0].text

prompt = """
Generate a series of multiple-choice security awareness questions 
for a leader-board style competition in the context of a National Research and Education Network (NREN). 
The questions should be provided in a JSON-like format but using a custom delimiter. Use the following guidelines:

Each field should be in the format key: value, where the colon (:) acts as the delimiter between the key and the value.
Separate different properties within the same field using a semicolon (;).
Use curly braces {} to denote objects and square brackets [] for arrays or enumerations.

The output should include the following fields:
Id: A unique identifier for the question (e.g., “Q001”).
Question: the text of the security awareness question.
Answers: an object containing the multiple-choice options as keys (“A”, “B”, “C”, “D”) and the corresponding text as values.
Correct_answer: the key corresponding to the correct multiple-choice question (e.g., “B”).
Hint: A brief hint that gives the participant a clue towards the correct answer.
Department: the specific department the question is targeting, 
e.g., “Finance Department”, “HR Department”, “Audit Department”, “Networks Department” and “Systems and Software Department”.
Passing_score: A positive integer representing the score a participant receives for answering the question correctly. 
The score should be higher for more difficult questions.
Failing_score: A negative integer representing the score a participant receives for answering the question incorrectly. 
The penalty should be more severe for more difficult questions.
Difficulty_level: A string representing the difficulty level of the question in the context of the targeted department 
e.g., “Low”, “Medium”, “High”, “Very High”.
"""

# Call the function with the defined prompt
questions = fetch_questions(prompt)
print(questions)

def save_questions_to_db(prompt):
    questions = fetch_questions(prompt)
    # Assuming the questions are returned in a suitable JSON-like format
    # Parse the questions and save them to the database

    # Example question parsing and saving:
    question_data = eval(questions)  # Convert the string response into a dictionary/list
    for q in question_data:
        new_question = QuestionBank(
            question_id=q['question_id'],
            question=q['question'],
            answers=q['answers'],
            correct_answer=q['correct_answer'],
            passing_score=q['passing_score'],
            failing_score=q['failing_score'],
            difficulty_level=q['difficulty_level'],
            department=q['department']
        )
        db.session.add(new_question)
    db.session.commit()
from flask import Blueprint, render_template, request, redirect, url_for
from app import db
from app.models import QuestionBank, UserResponses
from app.openai_poller import fetch_questions
from datetime import datetime

main = Blueprint('main', __name__)

@main.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        user_name = request.form.get('name')
        user_department = request.form.get('department')
        
        return redirect(url_for('main.questions', name=user_name, department=user_department))

    return render_template('index.html')

@main.route('/questions')
def questions():
    department = request.args.get('department').strip()
    print(f"Fetching questions for department: {department}")  # Debugging statement

    # Define the prompt for OpenAI
    prompt = f"""
    Generate a series of multiple-choice security awareness questions for a leader-board style competition in the context of a National Research and Education Network (NREN). The questions should be provided in a JSON-like format but using a custom delimiter. Use the following guidelines:

    Each field should be in the format key: value, where the colon (:) acts as the delimiter between the key and the value. Separate different properties within the same field using a semicolon (;). Use curly braces {{}} to denote objects and square brackets [] for arrays or enumerations.

    The output should include the following fields:
    Id: A unique identifier for the question (e.g., “Q001”).
    Question: the text of the security awareness question.
    Answers: an object containing the multiple-choice options as keys (“A”, “B”, “C”, “D”) and the corresponding text as values.
    Correct_answer: the key corresponding to the correct multiple-choice question (e.g., “B”).
    Hint: A brief hint that gives the participant a clue towards the correct answer.
    Department: the specific department the question is targeting, e.g., “Finance Department”, “HR Department”, “Audit Department”, “Networks Department” and “Systems and Software Department”.
    Passing_score: A positive integer representing the score a participant receives for answering the question correctly. The score should be higher for more difficult questions.
    Failing_score: A negative integer representing the score a participant receives for answering the question incorrectly. The penalty should be more severe for more difficult questions.
    Difficulty_level: A string representing the difficulty level of the question in the context of the targeted department e.g., “Low”, “Medium”, “High”, “Very High”.
    """

    # Fetch questions from OpenAI
    questions_text = fetch_questions(prompt)
    
    # Optionally parse the questions if necessary
    # Here we assume the questions are returned as a string
    # You might need to adapt this based on the format of the OpenAI response

    # Debug: Print fetched questions
    print(f"Questions fetched: {questions_text}")

    return render_template('questions.html', questions_text=questions_text)

@main.route('/submit_answer', methods=['POST'])
def submit_answer():
    question_id = request.form.get('question_id')
    user_answer = request.form.get('answer')
    correct_answer = QuestionBank.query.filter_by(question_id=question_id).first().correct_answer
    
    score = QuestionBank.query.filter_by(question_id=question_id).first().passing_score if user_answer == correct_answer else QuestionBank.query.filter_by(question_id=question_id).first().failing_score
    
    new_response = UserResponses(
        user_id=1,  # User's ID of the logged in person
        timestamp=datetime.now(),
        name=request.form.get('name'),
        score=score,
        question_id=question_id
    )
    
    db.session.add(new_response)
    db.session.commit()

    return redirect(url_for('main.index'))

@main.route('/test_db')
def test_db():
    questions = QuestionBank.query.all()
    if questions:
        return f"Database has {len(questions)} questions."
    else:
        return "No questions found in the database."

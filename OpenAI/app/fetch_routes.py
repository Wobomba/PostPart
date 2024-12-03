from flask import Blueprint, jsonify, request
from app.models import QuestionBank, UserResponses
from app import db
from datetime import datetime
import json

# Blueprint for fetch-related routes
fetch = Blueprint('fetch', __name__)

@fetch.route('/questions', methods=['GET'])
def fetch_questions():
    """
    Fetch questions for a specific department.
    """
    department = request.args.get('department', '').strip()
    if not department:
        return jsonify({"error": "Department is required"}), 400

    print(f"DEBUG: Fetching questions for department '{department}'")

    # Query questions with case-insensitive partial matching
    questions = QuestionBank.query.filter(
        QuestionBank.department.ilike(f"%{department}%")
    ).all()

    print(f"DEBUG: Questions fetched: {questions}")

    if not questions:
        return jsonify({"error": f"No questions available for department {department}"}), 404

    formatted_questions = [
        {
            "question": q.question,
            "options": [
                {"text": answer, "correct": key == q.correct_answer}
                for key, answer in json.loads(q.answers).items()
            ],
        }
        for q in questions
    ]

    return jsonify(formatted_questions)

@fetch.route('/submit', methods=['POST'])
def submit_answer():
    """
    Submit an answer to a specific question and update the user's score.
    """
    data = request.json
    question_id = data.get('question_id')
    user_answer = data.get('answer')
    user_name = data.get('name')

    # Debug: Log the incoming request data
    print(f"DEBUG: Data received for submission: {data}")

    if not all([question_id, user_answer, user_name]):
        return jsonify({"error": "Question ID, user answer, and user name are required"}), 400

    # Fetch the question from the database
    question = QuestionBank.query.filter_by(question_id=question_id).first()

    # Debug: Log the fetched question
    print(f"DEBUG: Question fetched for ID '{question_id}': {question}")

    if not question:
        return jsonify({"error": "Invalid question ID"}), 400

    # Determine if the answer is correct
    is_correct = user_answer == question.correct_answer
    score_change = question.passing_score if is_correct else question.failing_score

    # Record the user's response in the database
    new_response = UserResponses(
        user_id=1,  # Replace with session/user authentication logic
        timestamp=datetime.now(),
        name=user_name,
        score=score_change,
        question_id=question_id,
    )
    db.session.add(new_response)
    db.session.commit()

    # Debug: Log the response status
    print(f"DEBUG: User '{user_name}' submitted answer '{user_answer}'. Correct: {is_correct}")

    return jsonify({"correct": is_correct, "score_change": score_change})


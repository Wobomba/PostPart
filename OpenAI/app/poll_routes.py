from flask import Blueprint, jsonify, request, render_template
from app.openai_poller import fetch_questions
from app.models import QuestionBank
from app import db
import json

poll = Blueprint('poll', __name__)

@poll.route('/')
def landing_page():
    """
    Renders the landing page where users select their department.
    """
    departments = [
        "Systems and Software Department",
        "Networks",
        "Finance Operations",
        "Communications",
        "Business Development",
        "Internal Audit",
    ]
    return render_template('landing.html', departments=departments)

@poll.route('/fetch', methods=['POST'])
def poll_questions():
    """
    Fetches multiple-choice questions from OpenAI based on the provided department
    and saves them to the database.
    """
    # Extract the department from the request
    department = request.json.get('department', '').strip()
    if not department:
        return jsonify({"error": "Department is required"}), 400

    print(f"DEBUG: Polling questions for department: {department}")

    # Define the OpenAI prompt
    prompt = f"""
    Generate a series of multiple-choice security awareness questions focused on cybersecurity and data privacy for a leader-board style competition in the context of a National Research and Education Network (NREN). The questions should be provided in valid JSON format, with the following fields:
    Id: A unique identifier for the question (e.g., “Q001”).
    Question: The text of the security awareness question.
    Answers: An object containing multiple-choice options as keys (“A”, “B”, “C”, “D”) and the corresponding text as values.
    Correct_answer: The key corresponding to the correct multiple-choice question (e.g., “B”).
    Hint: A brief hint that gives the participant a clue towards the correct answer.
    Department: {department}.
    Passing_score: A positive integer representing the score a participant receives for answering the question correctly.
    Failing_score: A negative integer representing the score a participant receives for answering the question incorrectly.
    Difficulty_level: A string representing the difficulty level of the question in the context of the targeted department e.g., “Low”, “Medium”, “High”, “Very High”.
    """

    # Fetch questions from OpenAI
    fetched_questions = fetch_questions(prompt)

    if not fetched_questions:
        return jsonify({"error": "Failed to fetch questions from OpenAI."}), 500

    # Save questions to the database
    new_questions = []
    for question in fetched_questions:
        existing_question = QuestionBank.query.filter_by(question=question['Question']).first()
        if existing_question:
            print(f"DEBUG: Skipping duplicate question: {question['Question']}")
            continue

        new_question = QuestionBank(
            question_id=question['Id'],
            question=question['Question'],
            answers=json.dumps(question['Answers']),
            correct_answer=question['Correct_answer'],
            passing_score=question['Passing_score'],
            failing_score=question['Failing_score'],
            difficulty_level=question['Difficulty_level'],
            department=department
        )
        db.session.add(new_question)
        new_questions.append(new_question)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: Failed to save questions to the database: {e}")
        return jsonify({"error": "An error occurred while saving questions to the database."}), 500

    print(f"DEBUG: Successfully saved {len(new_questions)} new questions.")
    return jsonify({"message": f"Fetched and stored {len(new_questions)} questions."}), 200

from flask import Blueprint, jsonify, render_template, request, session, url_for, redirect
from app.models import QuestionBank, UserResponses, User
from app import db

fetch_bp = Blueprint('fetch', __name__)

@fetch_bp.route('/questions', methods=['GET'])
def fetch_questions():
    """
    Fetch questions for a specific department.
    """
    department = request.args.get('department', '').strip()
    if not department:
        return jsonify({"error": "Department is required"}), 400

    questions = QuestionBank.query.filter_by(department=department).all()
    if not questions:
        return jsonify({"error": "No questions available for this department."}), 404

    return jsonify({
        "questions": [
            {
                "id": q.id,
                "question": q.question,
                "options": q.options,
            }
            for q in questions
        ]
    })

@fetch_bp.route('/submit_response', methods=['POST'])
def submit_response():
    """
    Handles submission of quiz responses and updates the leaderboard.
    """
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    print("DEBUG: Received data:", data)

    user_id = session.get('user_id')

    # Check if user_id exists in the session
    if not user_id:
        return "User is not logged in or session has expired", 400

    print(f"DEBUG: user_id from session: {user_id}")

    user = User.query.get(user_id)

    # Verify that the user exists
    if not user:
        return "Invalid user ID. User does not exist.", 400

    print(f"DEBUG: User fetched from database: {user}")

    question_id = data.get('question_id')
    selected_option = data.get('selected_option')

    if not question_id or not selected_option:
        return "Both question_id and selected_option are required", 400

    question = QuestionBank.query.filter_by(id=question_id).first()
    if not question:
        return "Invalid question ID.", 400

    # Validate the response
    is_correct = selected_option == question.correct_answer
    score = question.passing_score if is_correct else question.failing_score

    # Check if the user already has an entry in the leaderboard
    user_response = UserResponses.query.filter_by(user_id=user_id).first()

    if user_response:
        # Update the existing score
        user_response.score += score
        print(f"DEBUG: Updated score for user {user_id}: {user_response.score}")
    else:
        # Create a new entry
        user_response = UserResponses(
            user_id=user_id,
            name=f"{user.first_name} {user.last_name}",
            score=score,
            question_id=question_id,
        )
        db.session.add(user_response)
        print(f"DEBUG: Created new entry for user {user_id} with score {score}")

    db.session.commit()

    # Render the result page
    return render_template('results.html', is_correct=is_correct, score=score)






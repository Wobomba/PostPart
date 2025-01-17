from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from app import db
from app.models import User, UserResponses, QuestionBank

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/')
def home():
    if 'user_id' in session:
        return redirect(url_for('auth.select_department'))
    return redirect(url_for('auth.login'))

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """
    Handles user login and redirects to the appropriate page.
    """
    if request.method == 'POST':
        # Use username for login
        username = request.form.get('username')
        password = request.form.get('password')

        # Query the User model using username
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['first_name'] = user.first_name
            session['last_name'] = user.last_name

            # Check if the user already has a department set
            if 'department' in session:
                return redirect(url_for('quiz.quiz_page'))

            # Redirect to select_department if no department is set
            return redirect(url_for('auth.select_department'))
        else:
            flash('Invalid username or password.', 'danger')

    return render_template('login.html')



@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        first_name = request.form.get('firstname')
        last_name = request.form.get('lastname')
        password = request.form.get('password')

        # Check if email or username is already registered
        existing_user = User.query.filter((User.username == username)).first()
        if existing_user:
            flash('Email or Username is already registered.', 'danger')
            return redirect(url_for('auth.register'))

        # Create new user
        new_user = User(
            username=username,
            first_name=first_name,
            last_name=last_name,
            
        )
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('auth.login'))

    return render_template('register.html', leaderboard=None)


@auth_bp.route('/select_department', methods=['GET', 'POST'])
def select_department():
    """
    Allows the user to select their department.
    """
    departments = [
        "Systems and Software Department",
        "Networks",
        "Finance Operations",
        "Communications",
        "Business Development",
        "Internal Audit",
    ]

    if request.method == 'POST':
        department = request.form.get('department')
        if department:
            session['department'] = department
            return redirect(url_for('quiz.quiz_page'))

    return render_template('select_department.html', departments=departments)



@auth_bp.route('/leaderboard', methods=['GET'])
def leaderboard():
    """
    Displays the leaderboard for users.
    """
    standings = (
        db.session.query(
            UserResponses.name,
            db.func.sum(UserResponses.score).label('total_score')
        )
        .group_by(UserResponses.user_id, UserResponses.name)
        .order_by(db.desc('total_score'))
        .all()
    )

    # Convert the query result into a list of dictionaries
    standings_list = [{"name": row[0], "total_score": row[1]} for row in standings]

    print("DEBUG: Standings List:", standings_list)

    return render_template('leaderboard.html', standings=standings_list, enumerate=enumerate)



@auth_bp.route('/logout', methods=['GET', 'POST'])
def logout():
    """
    Logs out the user by clearing the session and redirects to the login page.
    """
    session.clear()
    return redirect(url_for('auth.login'))


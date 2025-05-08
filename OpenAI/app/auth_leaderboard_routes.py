from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from app import db
from app.models import User, UserResponses, QuestionBank
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer
from flask import current_app
from app import mail
import time
import logging
from datetime import datetime, timedelta
from functools import wraps
from collections import defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

# In-memory storage for failed login attempts and lockout times
failed_attempts = {}
lockout_time = 15  # minutes

# In-memory storage for rate limiting
request_counts = defaultdict(int)
request_timestamps = defaultdict(list)
rate_limit_window = 60  # seconds
max_requests = 5  # maximum requests allowed in the time window

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'danger')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

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

        # Check if the account is locked
        if username in failed_attempts:
            lockout_until = failed_attempts[username]
            if datetime.now() < lockout_until:
                remaining_time = (lockout_until - datetime.now()).seconds // 60
                flash(f'Account locked. Please try again in {remaining_time} minutes.', 'danger')
                return render_template('login.html')

        # Query the User model using username
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['first_name'] = user.first_name
            session['last_name'] = user.last_name

            # Check if the user already has a department set
            if user.department:
                session['department'] = user.department
                return redirect(url_for('quiz.quiz_page'))
            else:
                # Redirect to select_department if no department is set
                return redirect(url_for('auth.select_department'))
        else:
            # Log failed login attempt
            logger.warning(f"Failed login attempt for username: {username}")
            # Increment failed attempts
            if username in failed_attempts:
                failed_attempts[username] = datetime.now() + timedelta(minutes=lockout_time)
            else:
                failed_attempts[username] = datetime.now() + timedelta(minutes=lockout_time)
            # Add a delay to prevent brute-force attacks
            time.sleep(2)
            flash('Invalid username or password.', 'danger')

    return render_template('login.html')



@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        first_name = request.form.get('firstname')
        last_name = request.form.get('lastname')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        # Validate required fields
        if not all([username, first_name, last_name, password, confirm_password]):
            flash('All fields are required.', 'danger')
            return redirect(url_for('auth.register'))

        # Check if passwords match
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return redirect(url_for('auth.register'))

        # Check if username is already registered
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('Username is already registered.', 'danger')
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
@login_required
def select_department():
    """
    Allows the user to select their department.
    """
    # Ensure the user can only access their own department selection
    user_id = session.get('user_id')
    if not user_id:
        flash('Please log in to access this page.', 'danger')
        return redirect(url_for('auth.login'))

    # Get the user from the database
    user = User.query.get(user_id)
    if user.department:
        # If user already has a department, redirect to quiz
        session['department'] = user.department
        return redirect(url_for('quiz.quiz_page'))

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
            # Save department to user record
            user.department = department
            db.session.commit()
            
            # Set department in session
            session['department'] = department
            return redirect(url_for('quiz.quiz_page'))

    return render_template('select_department.html', departments=departments)



@auth_bp.route('/leaderboard', methods=['GET'])
@login_required
def leaderboard():
    """
    Displays the leaderboard for users.
    """
    # Ensure the user can only access their own data
    user_id = session.get('user_id')
    if not user_id:
        flash('Please log in to access this page.', 'danger')
        return redirect(url_for('auth.login'))

    standings = (
        db.session.query(
            UserResponses.name,
            User.department,
            db.func.sum(UserResponses.score).label('total_score')
        )
        .join(User, UserResponses.user_id == User.id)
        .filter(UserResponses.user_id == user_id)  # Filter by the logged-in user's ID
        .group_by(UserResponses.user_id, UserResponses.name, User.department)
        .order_by(db.desc('total_score'))
        .all()
    )

    # Convert the query result into a list of dictionaries
    standings_list = [{"name": row[0], "department": row[1], "total_score": row[2]} for row in standings]

    print("DEBUG: Standings List:", standings_list)

    return render_template('leaderboard.html', standings=standings_list, enumerate=enumerate)



@auth_bp.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
    """
    Logs out the user by clearing the session and redirects to the login page.
    """
    session.clear()
    flash('You have been logged out.', 'success')
    return redirect(url_for('auth.login'))

@auth_bp.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    # Rate limiting
    client_ip = request.remote_addr
    current_time = datetime.now()
    request_timestamps[client_ip] = [t for t in request_timestamps[client_ip] if current_time - t < timedelta(seconds=rate_limit_window)]
    request_counts[client_ip] = len(request_timestamps[client_ip])
    request_timestamps[client_ip].append(current_time)

    if request_counts[client_ip] > max_requests:
        flash('Too many requests. Please try again later.', 'danger')
        return render_template('forgot_password.html')

    if request.method == 'POST':
        identifier = request.form.get('identifier')
        user = User.query.filter_by(username=identifier).first()
        if not user:
            # Log failed attempt
            logger.warning(f"Failed password reset attempt for username: {identifier}")
            # Add a delay to prevent brute-force attacks
            time.sleep(2)
            flash('If an account with that username exists, a password reset link has been sent.', 'info')
            return render_template('forgot_password.html')
        # Redirect to reset_password page if user exists
        return redirect(url_for('auth.reset_password', username=identifier))
    return render_template('forgot_password.html')

@auth_bp.route('/reset_password/<username>', methods=['GET', 'POST'])
def reset_password(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        flash('Invalid user.', 'danger')
        return redirect(url_for('auth.forgot_password'))

    if request.method == 'POST':
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')
        if not new_password or not confirm_password:
            flash('Please fill out all fields.', 'danger')
            return render_template('reset_password.html')
        if new_password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('reset_password.html')
        user.set_password(new_password)
        db.session.commit()
        flash('Your password has been reset. Please log in.', 'success')
        return redirect(url_for('auth.login'))
    return render_template('reset_password.html')


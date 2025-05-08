from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from app.config import Config
from flask_mail import Mail
from flask_login import LoginManager

# Initialize the database and migration
db = SQLAlchemy()
migrate = Migrate()
mail = Mail()
login_manager = LoginManager()

@login_manager.user_loader
def load_user(user_id):
    from app.models import User
    return User.query.get(int(user_id))

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize database and migrations
    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'

    # Register blueprints
    from app.auth_leaderboard_routes import auth_bp
    from app.fetch_routes import fetch_bp
    from app.quiz_routes import quiz_bp
    from app.biometric_routes import biometric_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(fetch_bp, url_prefix='/fetch')  
    app.register_blueprint(quiz_bp, url_prefix='/quiz')
    app.register_blueprint(biometric_bp, url_prefix='/biometric')

    return app

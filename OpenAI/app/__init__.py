from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from app.config import Config

# Initialize the database and migration
db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize database and migrations
    db.init_app(app)
    migrate.init_app(app, db)

    # Register blueprints
    from app.auth_leaderboard_routes import auth_bp
    from app.fetch_routes import fetch_bp
    from app.quiz_routes import quiz_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(fetch_bp, url_prefix='/fetch')  
    app.register_blueprint(quiz_bp, url_prefix='/quiz')

    return app

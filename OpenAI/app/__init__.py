from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from app.config import Config
import os

# Initialize the database and migration
db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize database and migrations
    db.init_app(app)
    migrate.init_app(app, db)

    # Debug: Print the database file being used
    db_path = os.path.abspath(app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', ''))
    print(f"Using database file: {db_path}")

    # Import and register Blueprints
    from app.poll_routes import poll
    from app.fetch_routes import fetch
    from app.quiz_routes import quiz

    app.register_blueprint(poll, url_prefix='/')
    app.register_blueprint(fetch, url_prefix='/api')
    app.register_blueprint(quiz)

    return app


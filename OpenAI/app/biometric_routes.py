from flask import Blueprint, jsonify, request, session
from app.models import User, BiometricCredential
from app import db
import base64
import json
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from cryptography.exceptions import InvalidSignature
import os
from datetime import datetime

biometric_bp = Blueprint('biometric', __name__)

@biometric_bp.route('/register-biometric', methods=['POST'])
def register_biometric():
    """
    Register a new biometric credential for a user.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'User not logged in'}), 401

    data = request.get_json()
    if not data or 'credential' not in data:
        return jsonify({'error': 'Invalid request data'}), 400

    try:
        # Extract credential data
        credential = data['credential']
        credential_id = base64.b64encode(credential['id']).decode('utf-8')
        public_key = base64.b64encode(credential['publicKey']).decode('utf-8')

        # Create new biometric credential
        new_credential = BiometricCredential(
            user_id=session['user_id'],
            credential_id=credential_id,
            public_key=public_key
        )
        db.session.add(new_credential)
        db.session.commit()

        return jsonify({'message': 'Biometric credential registered successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@biometric_bp.route('/verify-biometric', methods=['POST'])
def verify_biometric():
    """
    Verify a biometric credential.
    """
    data = request.get_json()
    if not data or 'credential' not in data:
        return jsonify({'error': 'Invalid request data'}), 400

    try:
        # Extract credential data
        credential = data['credential']
        credential_id = base64.b64encode(credential['id']).decode('utf-8')
        signature = base64.b64decode(credential['signature'])
        client_data = base64.b64decode(credential['clientDataJSON'])

        # Find the credential in the database
        stored_credential = BiometricCredential.query.filter_by(credential_id=credential_id).first()
        if not stored_credential:
            return jsonify({'error': 'Credential not found'}), 404

        # Verify the signature
        public_key = serialization.load_der_public_key(
            base64.b64decode(stored_credential.public_key)
        )
        
        try:
            public_key.verify(
                signature,
                client_data,
                ec.ECDSA(hashes.SHA256())
            )
            
            # Update sign count and last used timestamp
            stored_credential.sign_count += 1
            stored_credential.last_used = datetime.utcnow()
            db.session.commit()

            # Set user session
            user = User.query.get(stored_credential.user_id)
            session['user_id'] = user.id
            session['first_name'] = user.first_name
            session['last_name'] = user.last_name

            return jsonify({'message': 'Biometric verification successful'}), 200

        except InvalidSignature:
            return jsonify({'error': 'Invalid signature'}), 401

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@biometric_bp.route('/get-challenge', methods=['GET'])
def get_challenge():
    """
    Generate a challenge for biometric authentication.
    """
    challenge = os.urandom(32)
    session['challenge'] = base64.b64encode(challenge).decode('utf-8')
    return jsonify({
        'challenge': session['challenge'],
        'rpId': request.host,
        'timeout': 60000
    }) 
from flask import Flask, request
from flask_cors import CORS
from flask_socketio import SocketIO
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import torch
import numpy as np
from threading import Lock

LAN_IP = "192.168.1.161"
WebUI_LAN_Port = "3002"
Endpoint_LAN_Port = 3004

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="https://"+LAN_IP+WebUI_LAN_Port)
CORS(app, origins=["https://"+LAN_IP+WebUI_LAN_Port])

# Add a thread lock for thread safety
model_lock = Lock()

# Load Whisper model and processor
processor = WhisperProcessor.from_pretrained("openai/whisper-small")
model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-small")

# Maximum number of tokens to generate
MAX_NEW_TOKENS = 64

@socketio.on('connect')
def handle_connect():
    requester_ip = request.remote_addr  # Get the requester's IP address
    print(f'[Work] Started listening to audio streamed by {requester_ip}')

@socketio.on('disconnect')
def handle_disconnect():
    requester_ip = request.remote_addr  # Get the requester's IP address
    print(f'[Work] Stopped listening to audio streamed by {requester_ip}')

@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    try:
        requester_ip = request.remote_addr  # Get the requester's IP address
        print(f'[Work] Processing audio chunk from {requester_ip}')

        # Extract audio data and language from the dictionary
        audio_data = data.get('audio')
        language = data.get('language', 'en')  # Default to English if not provided
        if not audio_data:
            print('[ERROR] No audio data found in the request')
            return

        # Convert binary data to numpy array
        audio = np.frombuffer(audio_data, dtype=np.float32)

        # Process audio chunk
        inputs = processor(audio, sampling_rate=16000, return_tensors="pt").input_features

        # Generate transcription with the specified language
        with model_lock:  # Ensure thread safety
            with torch.no_grad():
                predicted_ids = model.generate(
                    inputs,
                    max_new_tokens=MAX_NEW_TOKENS,
                    language=language,  # Use the language parameter
                )

        transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]

        # Send transcription back to the client
        socketio.emit('transcription', {'transcription': transcription})
        print(f'[Work] Sent transcription to {requester_ip}: {transcription}')
    except Exception as e:
        print(f'[ERROR] Exception when transcribing: {e}')

@app.route('/transcribe', methods=['POST'])
def transcribe_http():
    try:
        requester_ip = request.remote_addr  # Get the requester's IP address
        print(f'[Work] Processing HTTP transcription request from {requester_ip}')

        # Get audio file and language from the request
        if 'file' not in request.files:
            return {'error': 'No file provided'}, 400

        file = request.files['file']
        language = request.form.get('language', 'en')  # Default to English if not provided
        audio = np.frombuffer(file.read(), dtype=np.float32)

        # Process audio chunk
        inputs = processor(audio, sampling_rate=16000, return_tensors="pt").input_features

        # Generate transcription with the specified language
        with model_lock:  # Ensure thread safety
            with torch.no_grad():
                predicted_ids = model.generate(
                    inputs,
                    max_new_tokens=MAX_NEW_TOKENS,
                    language=language,  # Use the language parameter
                )

        transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]

        return {'transcription': transcription}
    except Exception as e:
        print(f'[ERROR] Exception when transcribing: {e}')
        return {'error': str(e)}, 500

if __name__ == '__main__':
    # Path to your SSL certificate and key files
    ssl_cert = 'cert.cert'
    ssl_key = 'cert.key'

    # Run the Flask app over HTTPS
    socketio.run(app, host=LAN_IP, port=Endpoint_LAN_Port, ssl_context=(ssl_cert, ssl_key))
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import asyncio
import re
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from threading import Lock

LAN_IP = "192.168.1.161"
WebUI_LAN_Port = "3002"
Endpoint_LAN_Port = 3004

app = Flask(__name__)
CORS(app, origins=["https://"+LAN_IP+WebUI_LAN_Port])

# Load the NLLB-200-3.3B model and tokenizer
#model_id = 'Emilio407/nllb-200-3.3B-8bit'
#model_id = 'Emilio407/nllb-200-1.3B-8bit'
#model_id = 'Emilio407/nllb-200-distilled-1.3B-8bit'
model_id = 'Emilio407/nllb-200-distilled-600M-8bit'
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForSeq2SeqLM.from_pretrained(model_id)

# Add a thread lock for thread safety
model_lock = Lock()

def split_text_into_sentences(text):
    # Split text into sentences using regex
    sentences = re.split(r'(?<=[。！？.!?])', text)  # Split by full stop, exclamation mark, or question mark (Chinese and English only)
    return sentences

async def translate_text(text, src_lang, tgt_lang):
    try:
        # Split the text into sentences
        sentences = split_text_into_sentences(text)

        # Translate each sentence individually
        translated_sentences = []
        for sentence in sentences:
            # Skip empty sentences
            if not sentence.strip():
                continue

            # Get the target language token ID
            tgt_lang_token_id = tokenizer(tgt_lang, return_tensors="pt")["input_ids"][0][1]
            tgt_lang_token_id = tgt_lang_token_id.to("cuda:0")  # Move token ID to GPU

            # Tokenize the input sentence
            inputs = tokenizer(sentence, return_tensors="pt", max_length=512, truncation=True)
            inputs = {key: value.to("cuda:0") for key, value in inputs.items()}  # Move inputs to GPU

            # Generate translation
            with model_lock:  # Ensure thread safety
                output = model.generate(
                    inputs["input_ids"],
                    attention_mask=inputs["attention_mask"],
                    forced_bos_token_id=tgt_lang_token_id,  # Force the model to generate in the target language
                    max_length=512,  # Adjust based on expected output length
                    num_beams=3,  # Increase beam width for better quality
                    no_repeat_ngram_size=3,  # Avoid repeating n-grams
                    early_stopping=True,  # Stop early if the model predicts EOS
                    length_penalty=0.8,  # Encourage longer translations
                )

            # Decode the output
            translated_sentence = tokenizer.decode(output[0], skip_special_tokens=True)
            translated_sentences.append(translated_sentence)

        # Combine the translated sentences into a single text
        final_output = " ".join(translated_sentences)
        return final_output

    except Exception as error:
        print(f"[Error] Exception when translating: {error}")
        raise

@app.route('/translate', methods=['POST'])
def translate():
    data = request.json
    text = data.get('text')
    src_lang = data.get('src_lang')
    tgt_lang = data.get('tgt_lang')
    requester_ip = request.remote_addr
    print(f'[Work] Handling translation request from {requester_ip} ({src_lang} -> {tgt_lang})')

    if not text or not src_lang or not tgt_lang:
        return jsonify({'error': 'Missing text, src_lang, or tgt_lang'}), 400

    try:
        # Run the translation function
        translated_text = asyncio.run(translate_text(text, src_lang, tgt_lang))
        return jsonify({'translated_text': translated_text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Path to your SSL certificate and key files
    ssl_cert = 'cert.cert'
    ssl_key = 'cert.key'

    # Run the Flask app over HTTPS
    app.run(host=LAN_IP, port=Endpoint_LAN_Port, ssl_context=(ssl_cert, ssl_key))
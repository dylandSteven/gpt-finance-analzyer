from flask import Flask, request, make_response, jsonify, send_from_directory
import requests
import re
import json
from bs4 import BeautifulSoup
from openai import OpenAI
from flask_cors import CORS
from dotenv import load_dotenv
import os

# load_dotenv()
load_dotenv('/var/www/flaskapp/server/.env')
GPT_API_KEY = os.getenv('GPT_API_KEY')
CLIENT_PATH = os.getenv('CLIENT_PATH')
client = OpenAI(api_key=GPT_API_KEY)

app = Flask(__name__, static_folder=CLIENT_PATH, static_url_path='/')
CORS(app)

@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def catch_all(path):
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/test')
def hello():
    return make_response(jsonify({'msg': 'Hello World!'}), 200)

@app.route('/rate', methods=['POST'])
def upload_webs():
    if request.method == 'POST':
        data = request.json
        url = data['url']
        if 'question' in data:
            question = data['question']
        else:
            question = '''
                Please act as a professional analyst for the American stock market and do the following:
                1. Summaries the article
                2. Based on the sentiment you understand from the news, how would you rank that news from 1 to 10. (1- is super bad, 10- is excellent)
            '''
        try:
            print("=====================")
            question = f'(Send me an HTML response inside a div using text-align. The text should be formatted as RTL or LTR based on the language type.)\n{question}'
            print(question)
            response = requests.get(url, timeout=60)
            text = response.content.decode('utf-8')
            body = text.split('<div class="caas-body">')[1]
            body = body.split('<div id="view-cmts-cta')[0]
            body = re.sub(r'<div\b[^>]*>(.*?)</div>', '', body)
            body = body.replace('</div>', '')
            soup = BeautifulSoup(body, 'html.parser')
            body = soup.get_text()
            print(body)
            print("=====================")
            # return make_response(jsonify({'msg': '6'}), 200)
            chat = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": question},
                    {"role": "user", "content": body}
                ],
                model="gpt-3.5-turbo",
            )
            chat = chat.model_dump_json()
            chat = json.loads(chat)
            print(chat)
            return make_response(jsonify({'msg': chat['choices'][0]['message']['content']}), 200)
        except Exception as e:
            print(str(e))
            return make_response(jsonify({'msg': str(e)}), 400)

    return make_response(jsonify({'msg': 'Done'}), 200)

if __name__== '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
from flask import Flask, request, make_response, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import pandas as pd
import os

# load_dotenv()
load_dotenv('/var/www/flaskapp/server/.env')
GPT_API_KEY = os.getenv('GPT_API_KEY')
CLIENT_PATH = os.getenv('CLIENT_PATH')

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

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return make_response(jsonify({'error': 'No file part in the request'}), 400)
    
    file = request.files['file']
    
    if file.filename == '':
        return make_response(jsonify({'error': 'No file selected for uploading'}), 400)
    
    try:
        df = pd.read_csv(file)

        if 'Zestimate' not in df.columns: df['Zestimate'] = ''
        df['Zestimate'] = df['Zestimate'].astype('str')
        if 'Neighborhood' not in df.columns: df['Neighborhood'] = ''
        df['Neighborhood'] = df['Neighborhood'].astype('str')
        if 'lat' not in df.columns: df['lat'] = ''
        df['lat'] = df['lat'].astype('str')
        if 'lng' not in df.columns: df['lng'] = ''
        df['lng'] = df['lng'].astype('str')

        map_data = []

        addresses = df['Property Location'].tolist()
        for index, address in enumerate(addresses):
            zestimate = '' if (df.at[index, 'Zestimate'] == '' or df.at[index, 'Zestimate'] == 'nan' or df.at[index, 'Zestimate'] == 'none') else df.at[index, 'Zestimate']
            neighborhood = '' if (df.at[index, 'Neighborhood'] == '' or df.at[index, 'Neighborhood'] == 'nan' or df.at[index, 'Neighborhood'] == 'none') else df.at[index, 'Neighborhood']
            map_data.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [float(df.at[index, 'lng']), float(df.at[index, 'lat'])]
                },
                'properties': {
                    'title': 'Point 2',
                    'description': f'<strong>Description</strong><br/><span>Zestimate: {zestimate}</span><br/><span>Neighborhood: {neighborhood}</span>'
                }
            })

        return make_response(jsonify({'features': map_data}), 200)
    except Exception as e:
        return make_response(jsonify({'error': 'Unable to proceed this file'}), 400)

if __name__== '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
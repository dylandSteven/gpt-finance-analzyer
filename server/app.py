from flask import Flask, request, make_response, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import pandas as pd
import os
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from googleapiclient.discovery import build

try:
    if os.getlogin() == 'mon':
        load_dotenv()
    else:
        load_dotenv('/var/www/mapview/server/.env')
except:
    load_dotenv('/var/www/mapview/server/.env')
CLIENT_PATH = os.getenv('CLIENT_PATH')
CREDENTIALS = os.getenv('CREDENTIALS')
SPREADSHEET_ID = os.getenv('SPREADSHEET_ID')
SHEET_IDS = os.getenv('SHEET_IDS')
GOOGLE_SHEET = 'mapdata'

app = Flask(__name__, static_folder=CLIENT_PATH, static_url_path='/')
CORS(app)

scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS, scope)
client = gspread.authorize(creds)
service = build('sheets', 'v4', credentials=creds)
spreadsheet_id = SPREADSHEET_ID

@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def catch_all(path):
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/test')
def hello():
    return make_response(jsonify({'msg': 'Hello World!'}), 200)

@app.route('/sheet', methods=['GET'])
def get_sheet():
    map_data = {}
    filters = []
    visibleColumns = {}

    try:
        spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        filters = spreadsheet['sheets']
    except Exception as err:
        print(f'Filtering error: {str(err)}')

    try:
        sheet_ids = SHEET_IDS.split(',')
        for index, sheet_id in enumerate(sheet_ids):
            sheet_name = sheet_id.split('-')[0]
            sheet_no = sheet_id.split('-')[1]
            if sheet_name == 'neighborhoods': continue
            map_data[sheet_name] = []
            if sheet_name == 'inspection':
                map_data['favorite'] = []
            print("===", sheet_no)
            sheet = client.open(GOOGLE_SHEET).get_worksheet_by_id(sheet_no)
            data = sheet.get_all_values()

            df = pd.DataFrame(data[2:], columns=data[1])
            visibleColumns[sheet_name] = [data[1][i] for i, x in enumerate(data[0]) if (x == 1 or x == '1')]
            if 'lat' not in df.columns: df['lat'] = ''
            df['lat'] = df['lat'].astype('str')
            if 'lng' not in df.columns: df['lng'] = ''
            df['lng'] = df['lng'].astype('str')

            try:
                criteria = next((obj for obj in filters if str(obj['properties']['sheetId']) == sheet_no), None)
                criteria = criteria['basicFilter']['criteria']
                for key in criteria.keys():
                    if 'hiddenValues' in criteria[key]:
                        df = df[~df[data[1][int(key)]].isin(criteria[key]['hiddenValues'])]
            except Exception as err:
                print(f'Criteria error: {str(err)}')

            for itr, row in df.iterrows():
                try:
                    key_name = sheet_name
                    if sheet_name == 'inspection' and str(row['Favorite properties']) == '1':
                        key_name = 'favorite'
                    map_data[key_name].append({
                        'type': 'Feature',
                        'geometry': {
                            'type': 'Point',
                            'coordinates': [float(row['lng']), float(row['lat'])]
                        },
                        'properties': row.to_dict()
                    })
                except Exception as er:
                    print(f'Error in data formating: {str(er)}')
            time.sleep(1)
    except Exception as e:
        print(f'Error in sheet api: {str(e)}')

    return make_response(jsonify({'features': map_data, 'visibleColumns': visibleColumns}), 200)

@app.route('/neighborhoods', methods=['GET'])
def get_neighborhoods():
    neighborhoods = {}
    try:
        sheet_ids = SHEET_IDS.split(',')
        for index, sheet_id in enumerate(sheet_ids):
            sheet_name = sheet_id.split('-')[0]
            sheet_no = sheet_id.split('-')[1]
            if sheet_name != 'neighborhoods': continue
            sheet = client.open(GOOGLE_SHEET).get_worksheet_by_id(sheet_no)
            data = sheet.get_all_values()
            for row in data[1:]: # Ignore columns
                neighborhoods[row[0]] = {}
                for index, key in enumerate(data[0]):
                    if index < 2: continue # Ignore 'Neighborhood Name' and 'Level of Crime'
                    neighborhoods[row[0]][key] = row[index]
    except Exception as e:
        print(f'Error in neighborhoods api: {str(e)}')

    return make_response(jsonify({'neighborhoods': neighborhoods, 'keys': data[0][2:]}), 200)

@app.route('/update', methods=['POST'])
def update_cell():
    json_data = request.get_json()
    if json_data:
        property_location = json_data['propertyLocation']
        isFavorite = json_data['isFavorite']
    sheet_ids = SHEET_IDS.split(',')
    sheet_id = sheet_ids[0]
    sheet_no = sheet_id.split('-')[1]
    sheet = client.open(GOOGLE_SHEET).get_worksheet_by_id(sheet_no)
    data = sheet.get_all_values()
    property_location_index = next((i for i, item in enumerate(data[1]) if item == 'Property Location'), None)
    row_index = next((i for i, item in enumerate(data) if item[property_location_index] == property_location), None)
    sheet.update([['1' if isFavorite else '']], f'Y{row_index + 1}')
    return make_response(jsonify({'msg': 'Updated!'}), 200)

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
                    'title': 'Description',
                    'zestimate': zestimate,
                    'neighborhood': neighborhood
                }
            })

        return make_response(jsonify({'features': map_data}), 200)
    except Exception as e:
        return make_response(jsonify({'error': 'Unable to proceed this file'}), 400)

if __name__== '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
import requests, os
from dotenv import load_dotenv
import pandas as pd

load_dotenv()
GOOGLE_MAP_API = os.getenv('GOOGLE_MAP_API')
CSV_FILE_PATH = os.getenv('CSV_FILE_PATH')

def getArea(address):
    url = f'https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={GOOGLE_MAP_API}'
    response = requests.get(url)
    data = response.json()
    res = {'area': '', 'lat': 0, 'lng': 0, 'formatted_address': ''}
    if data['status'] == 'OK':
        for component in data['results'][0]['address_components']:
            if 'neighborhood' in component['types']:
                res['area'] = component['long_name']
                break
        location = data['results'][0]['geometry']['location']
        res['lat'] = location['lat']
        res['lng'] = location['lng']
        res['formatted_address'] = data['results'][0]['formatted_address']
    return res

def main():
    df = pd.read_csv(CSV_FILE_PATH)
    if 'Area' not in df.columns: df['Area'] = ''
    df['Area'] = df['Area'].astype('str')
    if 'lat' not in df.columns: df['lat'] = ''
    df['lat'] = df['lat'].astype('str')
    if 'lng' not in df.columns: df['lng'] = ''
    df['lng'] = df['lng'].astype('str')

    for index, row in df.iterrows():
        try:
            address = df.at[index, 'Property Location']
            if address != '4711 Owen Ave': continue
            city = df.at[index, 'City'] 
            state = df.at[index, 'State']
            full_address = f'{address} {city} {state}'
            data = getArea(full_address)
            print(data)
            address_items = address.split(' ')
            if address_items[0] not in data['formatted_address']:
                print(address)
                address = ' '.join(address_items[:-1])
                full_address = f'{address} {city} {state}'
                data = getArea(full_address)
                print(data)
                if address.split(' ')[0] not in data['formatted_address']: continue
                # o_lat = '{:4f}'.format(float(df.at[index, 'lat']))
                # o_lng = '{:4f}'.format(float(df.at[index, 'lng']))
                # n_lat = '{:4f}'.format(data['lat'])
                # n_lng = '{:4f}'.format(data['lng'])
                df.at[index, 'Area'] = data['area']
                df.at[index, 'lat'] = data['lat']
                df.at[index, 'lng'] = data['lng']
                df.to_csv(CSV_FILE_PATH, index=False)
        except Exception as e:
            print(f'err: {str(e)}')

main()
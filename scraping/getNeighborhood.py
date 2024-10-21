from shapely.geometry import Point, Polygon
import json, os
from dotenv import load_dotenv
import pandas as pd

load_dotenv()
CSV_FILE_PATH = os.getenv('CSV_FILE_PATH')

with open('neighborhoods.json', 'r') as f:
    data = json.load(f)

def getNeighborhood(point):
    for item in data:
        polygon = Polygon(item['geometry']['coordinates'][0])
        if polygon.contains(point):
            neighborhood = item['properties']['location']
            neighborhood = neighborhood.replace('Memphis, TN (', '').replace(')', '')
            crimelevel = item['properties']['crimelevel']
            return {'neighborhood': neighborhood, 'crimelevel': crimelevel}
    return {'neighborhood': '', 'crimelevel': -1}

def main():
    df = pd.read_csv(CSV_FILE_PATH)
    addresses = df['Property Location'].tolist()
    if 'Neighborhood' not in df.columns: df['Neighborhood'] = ''
    df['Neighborhood'] = df['Neighborhood'].astype('str')

    for index, address in enumerate(addresses):
        print(index, address)
        point = Point([float(df.at[index, 'lng']), float(df.at[index, 'lat'])])
        data = getNeighborhood(point)
        df.at[index, 'Neighborhood'] = data['neighborhood']
        if data['crimelevel'] > -1: df.at[index, 'Neighborhood crime score'] = data['crimelevel'] 
        df.to_csv(CSV_FILE_PATH, index=False)

main()
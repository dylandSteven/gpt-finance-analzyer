from shapely.geometry import Point, Polygon
import json, os
from dotenv import load_dotenv
import pandas as pd

load_dotenv()
CSV_FILE_PATH = os.getenv('CSV_FILE_PATH')

with open('neighborhoods.json', 'r') as f:
    data = json.load(f)

wrong_addresses = ['1758 Victoria Ave', '4828 Pine Forest Dr', '1683 S Prescott St', '4143 Owen Ave', '3915 Oak Branch #Cl', '4711 Owen Ave', '4433 Owen Ave', '4053 Clearpool', '5558 Oak Branch #Cl']
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
        if address not in wrong_addresses: continue
        point = Point([float(df.at[index, 'lng']), float(df.at[index, 'lat'])])
        data = getNeighborhood(point)
        print(index, address)
        df.at[index, 'Neighborhood'] = data['neighborhood']
        if data['crimelevel'] > -1: df.at[index, 'Neighborhood crime score'] = data['crimelevel'] 
        df.to_csv(CSV_FILE_PATH, index=False)

main()
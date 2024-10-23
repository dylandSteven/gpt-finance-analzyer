import requests
import json

# Define the query
url = "https://nominatim.openstreetmap.org/search"
params = {
    'q': 'Orange Mound, Memphis, TN',  # Specify the area
    'format': 'json',
    'polygon_geojson': 1    # Request GeoJSON polygon
}

# Make the request
response = requests.get(url, params=params)

# Parse the response as JSON
data = response.text
print(data)

with open('a.txt', 'w') as f:
    json.dump(data, f, indent=4)

# # Extract the polygon
# if 'geojson' in data[0]:
#     polygon = data[0]['geojson']
#     print(polygon)  # This will print the GeoJSON polygon
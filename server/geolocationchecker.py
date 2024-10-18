from shapely.geometry import Point, Polygon
import json

with open('neighborhoods.json', 'r') as f:
    data = json.load(f)

point = Point([-89.9580213, 35.1570884])
area = Polygon(data[10]['geometry']['coordinates'][0])

for item in data:
    polygon = Polygon(item['geometry']['coordinates'][0])
    # if polygon.contains(point):
    #     print(item['properties']['location'], '===', polygon)
    #     break
    if area.touches(polygon):
        print(item['properties']['location'])
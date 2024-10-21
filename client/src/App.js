import './App.css';
import { Checkbox, Button, FormControlLabel } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import { neighborhoods } from './data';

mapboxgl.accessToken = 'pk.eyJ1IjoiZHlsYW5kc2FsZGFuYSIsImEiOiJjbTI0dXhobnMwNGdoMnFxM2VwZzM5bzAxIn0.2PL3TnBGqeXWDN5XVlL-BA';

function App() {
  const serverUrl = 'http://18.234.164.138';
  // const serverUrl = 'http://localhost:8000';
  const INTERVAL_SECONDS = 30000;

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [data, setData] = useState({'0': [], '1': []});
  const [columns, setColumns] = useState([]);
  const [isNeighborhoods, setIsNeighborhoods] = useState(true);
  const columnsRef = useRef(columns);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize map
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-89.950535, 35.156449], // Center on the USA
      zoom: 11
    });

    // Add points as GeoJSON source
    mapRef.current.on('load', async () => {
      ////////// Draw Neighborhood Areas //////////
      neighborhoods.forEach((neighborhood, i) => {
        mapRef.current.addSource(`polygon${i}`, {
          'type': 'geojson',
          'data': {
            'type': 'FeatureCollection',
            'features': [neighborhood]
          }
        });

        mapRef.current.addLayer({
          'id': `polygon${i}`,
          'type': 'fill',
          'source': `polygon${i}`,
          'paint': {
            'fill-color': neighborhood.properties.color,
            'fill-opacity': 0.8
          }
        });

        mapRef.current.addLayer({
          'id': `polygon-outline${i}`,
          'type': 'line',
          'source': `polygon${i}`,
          'paint': {
            'line-color': '#fff',
            'line-width': 1
          }
        });
      });

      Object.keys(data).forEach((sheet_id, index) => {
        ////////// Draw Neighborhood Areas //////////
        mapRef.current.loadImage(`pin${index}.png`, async (error, image) => {
          if (error) throw error;
          mapRef.current.addImage(`pin${index}`, image);

          mapRef.current.addSource(`points${index}`, {
            'type': 'geojson',
            'data': {
              'type': 'FeatureCollection',
              'features': data[sheet_id]
            }
          });
    
          mapRef.current.addLayer({
            'id': `points-layer${index}`,
            'type': 'symbol',
            'source': `points${index}`,
            'layout': {
              'icon-image': `pin${index}`,
              'icon-size': 0.05,
              'icon-allow-overlap': true
            }
          });
    
          const popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false
          });
    
          mapRef.current.on('mouseenter', `points-layer${index}`, () => {
            mapRef.current.getCanvas().style.cursor = 'pointer';
          });

          mapRef.current.on('click', `points-layer${index}`, (e) => {
            const coordinates = e.features[0].geometry.coordinates.slice();
            const details = e.features[0].properties;
            let innerHtml = '<strong>Description</strong>';
            const visibleColumns = columnsRef.current.filter(obj => obj.isChecked);
            console.log(visibleColumns);
            Object.keys(details).forEach(property => {
              if (visibleColumns.find(obj => obj.name == property)) {
                innerHtml += `<br/><span>${property}: ${details[property]}</span>`
              }
            });
            popup
              .setLngLat(coordinates)
              .setHTML(innerHtml)
              .addTo(mapRef.current);
          });
    
          mapRef.current.on('mouseleave', `points-layer${index}`, () => {
            mapRef.current.getCanvas().style.cursor = '';
            popup.remove();
          });
        });
      });

      await handleGoogleSheet(true);
      // setTimeout(() => {
      //   setInterval(() => {
      //     handleGoogleSheet();
      //   }, 10000);
      // }, INTERVAL_SECONDS);
    });

    return () => mapRef.current.remove();
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      Object.keys(data).forEach((sheet_id, index) => {
        if (mapRef.current.getSource(`points${index}`)) {
          mapRef.current.getSource(`points${index}`).setData({
            'type': 'FeatureCollection',
            'features': data[sheet_id]
          });
        }
      });
    }
  }, [data]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const showColumns = () => {
    return columns.map(column => (
      <FormControlLabel
        style={{display: 'block'}}
        label={column.name}
        control={
          <Checkbox
            checked={column.isChecked}
            onChange={(e) => {
              const updatedColumns = [...columns];
              const itemToUpdate = updatedColumns.find(obj => obj.name === e.target.value);
              itemToUpdate.isChecked = !itemToUpdate.isChecked;
              setColumns(updatedColumns);
            }}
            value={column.name}
          />
        }
      />
    ));
  }

  const handleGoogleSheet = async (isColumnUpdate=false) => {
    setLoading(true);

    try {
      const response = await axios.get(`${serverUrl}/sheet`);
      setLoading(false);
      console.log(response);
      if (response.data.features) {
        setData(response.data.features);
        if (Object.keys(response.data.features).length > 0 && columns.length == 0 && isColumnUpdate) {
          const newColumns = [];
          Object.keys(response.data.features).forEach(sheet_id => {
            Object.keys(response.data.features[sheet_id][0].properties).forEach(property => {
              const existingColumn = newColumns.find(obj => obj.name === property);
              if (!existingColumn) newColumns.push({ name: property, isChecked: false });
            });
          });
          setColumns(newColumns);
        }
      }
    } catch (error) {
      setLoading(false);
      console.error('Error handleGoogleSheet: ', error);
    }
  };

  return (
    <div style={{display: 'flex'}}>
      <div ref={mapContainerRef} style={{ width: 'calc(100% - 360px)', height: '100vh' }} />
      <div style={{width: '360px', paddingLeft: '16px', height: '100vh', overflowY: 'scroll'}}>
        <FormControlLabel
          style={{display: 'block'}}
          label='Show Neighborhoods'
          control={
            <Checkbox
              checked={isNeighborhoods}
              onChange={(e) => {
                neighborhoods.forEach((neighborhood, i) => {
                  mapRef.current.setLayoutProperty(`polygon${i}`, 'visibility', !isNeighborhoods? 'visible' : 'none');
                });
                setIsNeighborhoods(!isNeighborhoods);
              }}
            />
          }
        />
        <h2>Inspection: {data[Object.keys(data)[0]].length}</h2>
        <h2>Sold Properties: {data[Object.keys(data)[1]].length}</h2>
        <h2>Show Values</h2>
        {showColumns()}
      </div>
    </div>
  );
}

export default App;

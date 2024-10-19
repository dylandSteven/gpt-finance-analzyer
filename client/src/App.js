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

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
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
    mapRef.current.on('load', () => {
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
      ////////// Draw Neighborhood Areas //////////

      mapRef.current.loadImage('pin.png', async (error, image) => {
        if (error) throw error;
        mapRef.current.addImage('custom-pin', image);

        await handleGoogleSheet(true);
        setTimeout(() => {
          setInterval(() => {
            handleGoogleSheet();
          }, 10000);
        }, 10000);

        mapRef.current.addSource('points', {
          'type': 'geojson',
          'data': {
            'type': 'FeatureCollection',
            'features': data
          }
        });
  
        mapRef.current.addLayer({
          'id': 'points-layer',
          'type': 'symbol',
          'source': 'points',
          'layout': {
            'icon-image': 'custom-pin',
            'icon-size': 0.015,
            'icon-allow-overlap': true
          }
        });
  
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false
        });
  
        mapRef.current.on('mouseenter', 'points-layer', () => {
          mapRef.current.getCanvas().style.cursor = 'pointer';
        });

        mapRef.current.on('click', 'points-layer', (e) => {
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
  
        mapRef.current.on('mouseleave', 'points-layer', () => {
          mapRef.current.getCanvas().style.cursor = '';
          popup.remove();
        });
      });
    });

    return () => mapRef.current.remove();
  }, []);

  useEffect(() => {
    if (mapRef.current && mapRef.current.getSource('points')) {
      mapRef.current.getSource('points').setData({
        'type': 'FeatureCollection',
        'features': data
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
        if (response.data.features.length > 0 && columns.length == 0 && isColumnUpdate) {
          const newColumns = [];
          Object.keys(response.data.features[0].properties).forEach(property => {
            newColumns.push({ name: property, isChecked: false });
          });
          setColumns(newColumns);
        }
      }
    } catch (error) {
      setLoading(false);
      console.error('Error uploading file: ', error);
    }
  };

  return (
    <div style={{display: 'flex'}}>
      <div ref={mapContainerRef} style={{ width: 'calc(100% - 360px)', height: '100vh' }} />
      <div style={{width: '360px', paddingLeft: '16px', height: '100vh', overflowY: 'scroll'}}>
        <h2>Show Values</h2>
        {showColumns()}
      </div>
    </div>
  );
}

export default App;

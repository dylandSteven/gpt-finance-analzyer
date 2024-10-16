import './App.css';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { Grid } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import { neighborhoods } from './data';

mapboxgl.accessToken = 'pk.eyJ1IjoiZHlsYW5kc2FsZGFuYSIsImEiOiJjbTI0dXhobnMwNGdoMnFxM2VwZzM5bzAxIn0.2PL3TnBGqeXWDN5XVlL-BA';

function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const fileInputRef = useRef(null);
  const [data, setData] = useState([]);
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

        // mapRef.current.on('mouseleave', `polygon${i}`, (e) => {
        //   mapRef.current.setPaintProperty(`polygon${i}`, 'fill-opacity', 0.8);
        //   mapRef.current.getCanvas().style.cursor = '';
        // });

        // mapRef.current.on('mouseenter', `polygon${i}`, (e) => {
        //   mapRef.current.setPaintProperty(`polygon${i}`, 'fill-opacity', 0);
        //   setTimeout(() => {
        //     mapRef.current.getCanvas().style.cursor = 'pointer';
        //   }, 50);
        // });

        // mapRef.current.on('mousemove', `polygon${i}`, (e) => {
        // });
      });
      ////////// Draw Neighborhood Areas //////////

      mapRef.current.loadImage('pin.png', (error, image) => {
        if (error) throw error;
        mapRef.current.addImage('custom-pin', image);

        mapRef.current.addSource('points', {
          'type': 'geojson',
          'data': {
            'type': 'FeatureCollection',
            'features': data
          }
        });
  
        // Add a circle layer to display the points
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
  
        // Create a popup but don’t add it to the map yet
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false
        });
  
        // Show popup on mouseenter
        mapRef.current.on('mouseenter', 'points-layer', (e) => {
          // Change the cursor to pointer
          mapRef.current.getCanvas().style.cursor = 'pointer';
  
          // Get the coordinates and properties of the feature
          const coordinates = e.features[0].geometry.coordinates.slice();
          const description = e.features[0].properties.description;
  
          // Set popup content and coordinates
          popup
            .setLngLat(coordinates)
            .setHTML(description)
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

  const handleFileChange = async (event) => {
    setLoading(true);

    const formData = new FormData();
    formData.append('file', event.target.files[0]);

    try {
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setLoading(false);
      console.log(response);
      if (response.data.features) setData(response.data.features);
    } catch (error) {
      setLoading(false);
      console.error('Error uploading file: ', error);
    }
  };

  return (
    <div>
      <div style={{display: 'flex', height: '120px', padding: '0px 40px', alignItems: 'center'}}>
        <input type='file' ref={fileInputRef} onChange={handleFileChange} style={{display: 'none'}} />
        <Button
          type='submit'
          variant='outlined'
          onClick={() => { fileInputRef.current.click(); }}
          disabled={loading}
          style={{height: '48px'}}
        >{loading ? 'Loading' : 'Upload'}</Button>
        <TextField placeholder='Filter' style={{marginLeft: '56px'}} />
        <Button variant='outlined' style={{height: '48px', marginLeft: '12px'}}>Filter</Button>
      </div>
      <div ref={mapContainerRef} style={{ width: '100%', height: 'calc(100vh - 120px)' }} />
    </div>
  );
}

export default App;

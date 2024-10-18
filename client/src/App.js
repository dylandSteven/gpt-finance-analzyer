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
  const serverUrl = 'http://18.234.164.138';
  // const serverUrl = 'http://localhost:8000';

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const fileInputRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [tmpFilter, setTmpFilter] = useState('');

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

      mapRef.current.loadImage('pin.png', async (error, image) => {
        if (error) throw error;
        mapRef.current.addImage('custom-pin', image);

        await handleGoogleSheet();
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
  
        mapRef.current.on('mouseenter', 'points-layer', () => {
          mapRef.current.getCanvas().style.cursor = 'pointer';
        });

        mapRef.current.on('click', 'points-layer', (e) => {
          const coordinates = e.features[0].geometry.coordinates.slice();
          const details = e.features[0].properties;
          popup
            .setLngLat(coordinates)
            .setHTML(`
              <strong>${details.title}</strong>
              <br/>
              <span>Zestimate: ${details.zestimate}</span>
              <br/>
              <span>Neighborhood: ${details.neighborhood}</span>
            `)
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
      const filterData = [];
      const filterKey = filter.toLowerCase();
      data.forEach(item => {
        const text = item.properties.zestimate.toLowerCase() + item.properties.neighborhood.toLowerCase();
        if (text.includes(filterKey)) {
          filterData.push(item);
        }
      });
      mapRef.current.getSource('points').setData({
        'type': 'FeatureCollection',
        'features': filterData
      });
    }
  }, [data, filter]);

  const handleFileChange = async (event) => {
    setLoading(true);

    const formData = new FormData();
    formData.append('file', event.target.files[0]);

    try {
      const response = await axios.post(`${serverUrl}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setLoading(false);
      console.log(response);
      if (response.data.features) {
        setData(response.data.features);
      }
    } catch (error) {
      setLoading(false);
      console.error('Error uploading file: ', error);
    }
  };


  const handleGoogleSheet = async () => {
    setLoading(true);

    try {
      const response = await axios.get(`${serverUrl}/sheet`);
      setLoading(false);
      console.log(response);
      if (response.data.features) {
        setData(response.data.features);
      }
    } catch (error) {
      setLoading(false);
      console.error('Error uploading file: ', error);
    }
  };

  const handleFilter = () => {
    setFilter(tmpFilter);
  }

  return (
    <div>
      <div style={{display: 'flex', height: '120px', padding: '0px 40px', alignItems: 'center'}}>
        <input type='file' ref={fileInputRef} onChange={handleFileChange} style={{display: 'none'}} />
        {/* <Button
          type='submit'
          variant='outlined'
          onClick={() => { fileInputRef.current.click(); }}
          disabled={loading}
          style={{height: '48px'}}
        >{loading ? 'Loading' : 'Upload'}</Button>
        <Button
          type='submit'
          variant='outlined'
          onClick={() => { handleGoogleSheet(); }}
          disabled={loading}
          style={{height: '48px', marginLeft: '36px'}}
        >{loading ? 'Loading' : 'Connect Google Sheet'}</Button> */}
        <TextField placeholder='Filter' value={tmpFilter} onChange={(e) => { setTmpFilter(e.target.value); }} />
        <Button
          variant='outlined'
          style={{height: '48px', marginLeft: '12px'}}
          onClick={() => { handleFilter(); }}
        >Filter</Button>
      </div>
      <div ref={mapContainerRef} style={{ width: '100%', height: 'calc(100vh - 120px)' }} />
    </div>
  );
}

export default App;

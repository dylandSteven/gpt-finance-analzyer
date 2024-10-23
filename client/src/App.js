import './App.css';
import { Checkbox, Button, FormControlLabel, Divider } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import { neighborhoods } from './data';

mapboxgl.accessToken = 'pk.eyJ1IjoiZHlsYW5kc2FsZGFuYSIsImEiOiJjbTI0dXhobnMwNGdoMnFxM2VwZzM5bzAxIn0.2PL3TnBGqeXWDN5XVlL-BA';

function App() {
  const serverUrl = 'http://analyzer-1636149603.us-east-1.elb.amazonaws.com';
  // const serverUrl = 'http://localhost:8000';
  const INTERVAL_SECONDS = 30000;

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [data, setData] = useState({'0': [], '1': []});
  const [columns, setColumns] = useState({'0': [], '1': []});
  const [visibleMapSources, setVisibleMapSources] = useState({
    isNeighborhoods: true,
    isInspection: true,
    isSoldProperties: true
  });
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
            let innerHtml = '';
            const visibleColumns = columnsRef.current[Object.keys(columnsRef.current)[index]].filter(obj => obj.isChecked);
            Object.keys(details).forEach(property => {
              if (visibleColumns.find(obj => obj.name == property)) {
                innerHtml += `<br/><span><strong>${property}:</strong> ${details[property]}</span>`
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

      await handleGoogleSheet();
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
    return Object.keys(columns).map((sheet_id, index) => {
      return columns[sheet_id].map(column => (
        <>
          <FormControlLabel
            label={column.name}
            style={index == 0 ? {color: 'red'} : {color: 'black'}}
            control={
              <Checkbox
                checked={column.isChecked}
                onChange={(e) => {
                  const updatedColumns = [...columns[sheet_id]];
                  const itemToUpdate = updatedColumns.find(obj => obj.name === e.target.value);
                  itemToUpdate.isChecked = !itemToUpdate.isChecked;
                  setColumns({...columns, [sheet_id]: updatedColumns});
                }}
                value={column.name}
              />
            }
          />
          <br />
        </>
      ));
    });
  }

  const handleGoogleSheet = async () => {
    setLoading(true);

    try {
      const response = await axios.get(`${serverUrl}/sheet`);
      setLoading(false);
      console.log(response);
      if (response.data.features) {
        setData(response.data.features);
      }
      if (response.data?.visibleColumns) {
        const newColumns = {};
        const visibleColumns = response.data.visibleColumns;
        Object.keys(visibleColumns).forEach(sheet_id => {
          newColumns[sheet_id] = [];
          visibleColumns[sheet_id].forEach(column => {
            newColumns[sheet_id].push({ name: column, isChecked: false });
          });
        });
        setColumns(newColumns);
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
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Show Map</h2>
          <img
            src='refresh.svg'
            alt='refresh'
            style={{width: '18px', paddingRight: '15px', cursor: 'pointer'}}
            onClick={() => { handleGoogleSheet(); }}
          />
        </div>
        <FormControlLabel
          label='Neighborhoods'
          control={
            <Checkbox
              checked={visibleMapSources.isNeighborhoods}
              onChange={(e) => {
                neighborhoods.forEach((neighborhood, i) => {
                  mapRef.current.setLayoutProperty(`polygon${i}`, 'visibility', !visibleMapSources.isNeighborhoods? 'visible' : 'none');
                });
                setVisibleMapSources({...visibleMapSources, isNeighborhoods: !visibleMapSources.isNeighborhoods});
              }}
            />
          }
        /><br />
        <FormControlLabel
          label='Inspection'
          control={
            <Checkbox
              checked={visibleMapSources.isInspection}
              onChange={(e) => {
                mapRef.current.setLayoutProperty('points-layer0', 'visibility', !visibleMapSources.isInspection? 'visible' : 'none');
                setVisibleMapSources({...visibleMapSources, isInspection: !visibleMapSources.isInspection});
              }}
            />
          }
        /><br />
        <FormControlLabel
          label='Sold Properties'
          control={
            <Checkbox
              checked={visibleMapSources.isSoldProperties}
              onChange={(e) => {
                mapRef.current.setLayoutProperty('points-layer1', 'visibility', !visibleMapSources.isSoldProperties? 'visible' : 'none');
                setVisibleMapSources({...visibleMapSources, isSoldProperties: !visibleMapSources.isSoldProperties});
              }}
            />
          }
        />
        <Divider />
        <h2>Properties</h2>
        {data[Object.keys(data)[0]].length > 0 ? (<h4>Inspection: {data[Object.keys(data)[0]].length}</h4>) : ''}
        {data[Object.keys(data)[1]].length > 0 ? (<h4>Sold Properties: {data[Object.keys(data)[1]].length}</h4>) : ''}
        <Divider />
        <h2>Show Values</h2>
        {showColumns()}
      </div>
      {loading ? (<div style={{
          display: 'flex',
          position: 'fixed',
          width: '100%',
          height: '100vh',
          zIndex: 1,
          background: '#000000e0',
          alignItems: 'center',
          justifyContent: 'center'
        }}><h1 style={{color: 'white'}}>Loading...</h1></div>) :
      ''}
    </div>
  );
}

export default App;

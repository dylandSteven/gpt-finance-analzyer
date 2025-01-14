import './App.css';
import { Checkbox, FormControlLabel, Divider } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import * as turf from '@turf/turf';
import { neighborhoods } from './data';

mapboxgl.accessToken = 'pk.eyJ1IjoiZHlsYW5kc2FsZGFuYSIsImEiOiJjbTI0dXhobnMwNGdoMnFxM2VwZzM5bzAxIn0.2PL3TnBGqeXWDN5XVlL-BA';

function App() {
  // const serverUrl = 'http://analyzer-1636149603.us-east-1.elb.amazonaws.com';
  const serverUrl = 'http://localhost:8000';
  // const INTERVAL_SECONDS = 30000;

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [data, setData] = useState({'inspection': [], 'favorite': [], 'sold_properties': [], 'past_sale': []});
  const dataRef = useRef(data);
  const [columns, setColumns] = useState({'0': [], '1': [], '2': []});
  const columnsRef = useRef(columns);
  const [popups, setPopups] = useState([]);
  const popupsRef = useRef(popups);
  const [ndKeys, setNdKeys] = useState({});
  const [neighborhoodTexts, setNeighborhoodTexts] = useState([]);
  const [visibleMapSources, setVisibleMapSources] = useState({
    isNeighborhoods: true,
    inspection: true,
    favorite: true,
    sold_properties: true,
    past_sale: true
  });
  const [loading, setLoading] = useState(false);

  const updateFavorite = async (isMarked, details) => {
    const originKey = isMarked ? 'favorite' : 'inspection', moveKey = isMarked ? 'inspection' : 'favorite';
    const selectedItem = dataRef.current[originKey].find(item => item['properties']['Property Location'] === details['Property Location']);
    selectedItem['properties']['Favorite properties'] = isMarked ? '' : '1';
    setData({
      ...dataRef.current,
      [originKey]: dataRef.current[originKey].filter(item => item['properties']['Property Location'] !== details['Property Location']),
      [moveKey]: [...dataRef.current[moveKey], selectedItem]
    });
    popupsRef.current.forEach(popup => { popup.remove(); });
    popupsRef.current = [];
    setLoading(true);
    const response = await axios.post(`${serverUrl}/update`, { propertyLocation: details['Property Location'], isFavorite: !isMarked });
    if (response.status !== 200) alert('Request Failed');
    setLoading(false);
  };

  const PopupContent = ({innerHtml, visible, favorite, details}) => (
    <div>
      <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '5px'}}>
        {visible ? (
          favorite ? (
            <FavoriteIcon
              style={{fontSize: '18px', cursor: 'pointer'}}
              onClick={() => { updateFavorite(favorite, details); }}
            />
          ) : (
            <FavoriteBorderIcon
              style={{fontSize: '18px', cursor: 'pointer'}}
              onClick={() => { updateFavorite(favorite, details); }}
            />
          )
        ) : ''}

      </div>
      <div dangerouslySetInnerHTML={{ __html: innerHtml }} />
    </div>
  );  

  useEffect(() => {
    // Initialize map
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-89.950535, 35.156449],
      zoom: 11
    });

    mapRef.current.on('load', async () => {
      let popups = [];
      const _neighborhoodTexts = [];
      ////////// Draw Neighborhood Areas //////////
      setLoading(true);
      const response = await axios.get(`${serverUrl}/neighborhoods`);
      const { neighborhoods: neighborhoodsDetails, keys: _ndKeys } = response.data;
      const ndKeysTmp = {};
      _ndKeys.forEach(_ndKey => { ndKeysTmp[_ndKey] = false; })
      setNdKeys(ndKeysTmp);
      setLoading(false);
      neighborhoods.forEach((neighborhood, i) => {
        const neighborhoodDetailKey = Object.keys(neighborhoodsDetails).find(key => neighborhood.properties.location.includes(key));
        const neighborhoodDetail = neighborhoodsDetails[neighborhoodDetailKey];
        const centroid = turf.centroid(neighborhood);
        const [lng, lat] = centroid.geometry.coordinates;

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

        const addNeighborhoodDetail = (lng, lat, text) => {
          const textElement = document.createElement('div');
          textElement.style.fontSize = '16px';
          textElement.style.color = 'black';
          textElement.style.backgroundColor = 'white';
          textElement.style.padding = '2px 5px';
          textElement.style.borderRadius = '3px';
          textElement.style.display = 'none';
          textElement.textContent = text;
          new mapboxgl.Marker({ element: textElement })
            .setLngLat([lng, lat])
            .addTo(mapRef.current);
          return textElement;
        };

        if (neighborhoodDetail) {
          Object.keys(neighborhoodDetail).forEach(key => {
            const textElement = addNeighborhoodDetail(lng, lat, neighborhoodDetail[key]);
            _neighborhoodTexts.push({name: key, textElement});
          });
        }
      });
      setNeighborhoodTexts(_neighborhoodTexts);

      mapRef.current.on('click', () => {
        popupsRef.current.forEach(popup => {
          popup.remove();
        });
        popupsRef.current = [];
      });

      Object.keys(data).forEach((sheet_id) => {
        ////////// Draw Neighborhood Areas //////////
        mapRef.current.loadImage(`pin-${sheet_id}.png`, async (error, image) => {
          if (error) throw error;
          mapRef.current.addImage(`pin${sheet_id}`, image);

          mapRef.current.addSource(`points${sheet_id}`, {
            'type': 'geojson',
            'data': {
              'type': 'FeatureCollection',
              'features': data[sheet_id]
            }
          });
    
          mapRef.current.addLayer({
            'id': `points-layer${sheet_id}`,
            'type': 'symbol',
            'source': `points${sheet_id}`,
            'layout': {
              'icon-image': `pin${sheet_id}`,
              'icon-size': 0.05,
              'icon-allow-overlap': true
            }
          });
    
          const popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false
          });
    
          mapRef.current.on('mouseenter', `points-layer${sheet_id}`, () => {
            mapRef.current.getCanvas().style.cursor = 'pointer';
          });

          mapRef.current.on('click', `points-layer${sheet_id}`, (e) => {
            const coordinates = e.features[0].geometry.coordinates.slice();
            const details = e.features[0].properties;
            let innerHtml = '';
            let key_id = sheet_id;
            if (sheet_id === 'favorite') key_id = 'inspection';
            const visibleColumns = columnsRef.current[key_id].filter(obj => obj.isChecked);
            Object.keys(details).forEach(property => {
              if (visibleColumns.find(obj => obj.name === property)) {
                innerHtml += `<span style='display: block;'><strong>${property}:</strong> ${details[property]}</span>`
              }
            });
            const popupNode = document.createElement('div');
            const root = createRoot(popupNode);
            root.render(
              <PopupContent
                innerHtml={innerHtml}
                visible={sheet_id === 'inspection' || sheet_id === 'favorite'}
                favorite={details?.['Favorite properties']?.toString() === '1'}
                details={details}
              />
            );
            popup
              .setLngLat(coordinates)
              .setDOMContent(popupNode)
              .addTo(mapRef.current);
            setPopups([...popups, popup]);
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
      Object.keys(data).forEach((sheet_id) => {
        if (mapRef.current.getSource(`points${sheet_id}`)) {
          mapRef.current.getSource(`points${sheet_id}`).setData({
            'type': 'FeatureCollection',
            'features': data[sheet_id]
          });
        }
      });
    }
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  useEffect(() => {
    popupsRef.current = popups;
  }, [popups]);

  const showColumns = () => {
    return Object.keys(columns).map((sheet_id) => {
      return columns[sheet_id].map(column => (
        <>
          <FormControlLabel
            label={column.name}
            style={sheet_id === 'sold_properties' ? {color: 'black'} : (sheet_id === 'past_sale' ? {color: 'orange'} : {color : 'red'})}
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

  const showMapLayers = () => {
    return Object.keys(data).map(key => (
      <FormControlLabel
        label={key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        control={
          <Checkbox
            checked={visibleMapSources[key]}
            onChange={(e) => {
              mapRef.current.setLayoutProperty(`points-layer${key}`, 'visibility', !visibleMapSources[key]? 'visible' : 'none');
              setVisibleMapSources({...visibleMapSources, [key]: !visibleMapSources[key]});
            }}
          />
        }
      />
    ));
  }

  const showNeighborhoodDetails = () => {
    return Object.keys(ndKeys).map(key => (
      <FormControlLabel
        label={key}
        control={
          <Checkbox
            checked={ndKeys[key]}
            onChange={(e) => {
              setNdKeys({...ndKeys, [key]: !ndKeys[key]});
              neighborhoodTexts.forEach(neighborhoodText => {
                if (neighborhoodText.name === key) {
                  neighborhoodText.textElement.style.display = !ndKeys[key] ? 'block' : 'none';
                }
              });
            }}
          />
        }
      />
    ));
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
        />
        {showMapLayers()}
        <Divider />
        <h2>Properties</h2>
        <h4>Inspection: {data['inspection'].length}</h4>
        <h4 style={{paddingLeft: '16px'}}>Favorite: {data['favorite'].length}</h4>
        <h4>Sold Properties: {data['sold_properties'].length}</h4>
        <h4>Past Sale: {data['past_sale'].length}</h4>
        <Divider />
        <h2>Neighborhoods</h2>
        {showNeighborhoodDetails()}
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

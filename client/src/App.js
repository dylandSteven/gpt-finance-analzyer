import './App.css';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { Grid } from '@mui/material';
import { useState } from 'react';
import axios from 'axios';

function App() {
  const API_SERVER = 'http://13.59.71.163';
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="App">
      <br />
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            id="article-url"
            label="Article URL"
            variant="outlined"
            style={{width: '80%'}}
            onChange={(e) => {setUrl(e.target.value)}}
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="outlined"
            style={{width: '80%'}}
            disabled={loading}
            onClick={() => {
              setLoading(true);
              axios.post(`${API_SERVER}/rate`, { url })
              .then(response => {
                if (response.status == 200) {
                  setRate(response.data.msg);
                }
                setLoading(false);
              })
              .catch(error => {
                console.log(error);
                setLoading(false);
              });
            }}
          >
            Rate Article
          </Button>
        </Grid>
        {rate ? (
          <Grid item xs={12} style={{display: 'flex', justifyContent: 'center'}}>
            <h3 style={{width: '80%'}}>Rate: {rate}</h3>
          </Grid>
        ) : ''}
        {error ? (
          <Grid item xs={12} style={{display: 'flex', justifyContent: 'center'}}>
            <h3 style={{color: 'red', width: '80%'}}>Error: {error}</h3>
          </Grid>
        ) : ''}
      </Grid>
    </div>
  );
}

export default App;

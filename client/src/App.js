import './App.css';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { Grid } from '@mui/material';
import { useState } from 'react';
import axios from 'axios';
import parse from 'html-react-parser';

function App() {
  const API_SERVER = 'http://13.59.71.163';
  // const API_SERVER = 'http://localhost:8000';
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState('');
  const [question, setQuestion] = useState('Please act as a professional analyst for the American stock market and do the following:\n1. Summaries the article\n2. Based on the sentiment you understand from the news, how would you rank that news from 1 to 10. (1- is super bad, 10- is excellent)');
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
          <TextField
            id="outlined-multiline-flexible"
            label="Question"
            multiline
            maxRows={4}
            style={{width: '80%'}}
            defaultValue={question}
            onChange={(e) => {setQuestion(e.target.value)}}
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="outlined"
            style={{width: '80%'}}
            disabled={loading}
            onClick={() => {
              setLoading(true);
              axios.post(`${API_SERVER}/rate`, { url, question })
              .then(response => {
                if (response.status == 200) {
                  console.log(response.data.msg, response.data.msg.includes('\n'));
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
            {/* <h3 style={{width: '80%', textAlign: 'left', whiteSpace: 'pre-line'}}>{rate}</h3> */}
            <div style={{width: '80%'}}>{parse(rate)}</div>
          </Grid>
        ) : ''}
        {error ? (
          <Grid item xs={12} style={{display: 'flex', justifyContent: 'center'}}>
            <h3 style={{color: 'red', width: '80%', textAlign: 'left'}}>Error: {error}</h3>
          </Grid>
        ) : ''}
      </Grid>
    </div>
  );
}

export default App;

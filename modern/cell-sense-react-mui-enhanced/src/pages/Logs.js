import React, { useState, useEffect } from 'react';
import { TextField, Button, Typography, Grid, Card, List, ListItem, ListItemText } from '@mui/material';

const Logs = () => {
  const [intensity, setIntensity] = useState('');
  const [note, setNote] = useState('');
  const [logs, setLogs] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const entry = {
      intensity,
      note,
      timestamp: new Date().toLocaleString()
    };
    setLogs([entry, ...logs]);
    setIntensity('');
    setNote('');
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>Log Pain Episode</Typography>
      <Card sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Intensity (1–10)"
                type="number"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button type="submit" variant="contained" color="primary" fullWidth sx={{ height: '100%' }}>
                Log
              </Button>
            </Grid>
          </Grid>
        </form>
      </Card>

      <Typography variant="h6" gutterBottom>Recent Logs</Typography>
      <List>
        {logs.map((log, index) => (
          <ListItem key={index} sx={{ borderBottom: '1px solid #eee' }}>
            <ListItemText
              primary={`Intensity: ${log.intensity} - ${log.note || 'No note'}`}
              secondary={log.timestamp}
            />
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default Logs;

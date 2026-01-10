import React, { useState, useEffect } from 'react';
import { TextField, Button, Typography, Grid, Card, List, ListItem, ListItemText } from '@mui/material';

const Medication = () => {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [time, setTime] = useState('');
  const [meds, setMeds] = useState([]);

  useEffect(() => {
    Notification.requestPermission();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const entry = { name, dose, time };
    setMeds([...meds, entry]);
    scheduleReminder(entry);
    setName('');
    setDose('');
    setTime('');
  };

  const scheduleReminder = ({ name, time }) => {
    const now = new Date();
    const [hh, mm] = time.split(':').map(Number);
    const reminder = new Date();
    reminder.setHours(hh, mm, 0, 0);
    let delay = reminder - now;
    if (delay < 0) delay += 24 * 60 * 60 * 1000;

    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('💊 Medication Reminder', {
          body: `Time to take: ${name}`,
        });
      }
    }, delay);
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>Medication Reminders</Typography>
      <Card sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Medication Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Dosage"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button type="submit" variant="contained" color="primary" fullWidth sx={{ height: '100%' }}>
                Save
              </Button>
            </Grid>
          </Grid>
        </form>
      </Card>

      <Typography variant="h6" gutterBottom>Scheduled Medications</Typography>
      <List>
        {meds.map((med, index) => (
          <ListItem key={index} sx={{ borderBottom: '1px solid #eee' }}>
            <ListItemText
              primary={`${med.name} — ${med.dose || 'N/A'} at ${med.time}`}
            />
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default Medication;

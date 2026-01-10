import React, { useEffect } from 'react';
import { Typography, Grid, Card, List, ListItem, ListItemText } from '@mui/material';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

const Insights = () => {
  const painData = [2, 1, 3, 2, 0, 1, 1];
  const oxygenData = [97, 96, 95, 94, 93, 96, 97];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: false }
    }
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>Health Insights</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Weekly Pain Episodes</Typography>
            <Line data={{
              labels,
              datasets: [{
                data: painData,
                label: "Pain Episodes",
                borderColor: "#EF5350",
                tension: 0.4,
                fill: false
              }]
            }} options={lineOptions} />
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Oxygen Level Trend</Typography>
            <Line data={{
              labels,
              datasets: [{
                data: oxygenData,
                label: "Oxygen %",
                borderColor: "#66BB6A",
                tension: 0.4,
                fill: false
              }]
            }} options={lineOptions} />
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Personalized Recommendations</Typography>
            <List>
              <ListItem><ListItemText primary="🧴 Increase fluid intake to stay hydrated." /></ListItem>
              <ListItem><ListItemText primary="🧘‍♂️ Practice deep breathing to stabilize oxygen." /></ListItem>
              <ListItem><ListItemText primary="💊 Don't forget your 8:00 AM meds." /></ListItem>
            </List>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default Insights;

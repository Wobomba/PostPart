import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import {
  Favorite as HeartIcon,
  Opacity as OxygenIcon,
  Thermostat as TempIcon,
  LocalDrink as HydrationIcon,
  MedicalServices as PainIcon
} from '@mui/icons-material';

const VITAL_THRESHOLDS = {
  heartRate: 120,
  oxygen: 93,
  temperature: 38,
  hydration: 50,
};

const vitalsMeta = [
  { label: 'Heart Rate', unit: 'bpm', icon: <HeartIcon color="error" /> },
  { label: 'Oxygen Level', unit: '%', icon: <OxygenIcon color="primary" /> },
  { label: 'Temperature', unit: '°C', icon: <TempIcon color="warning" /> },
  { label: 'Hydration', unit: '%', icon: <HydrationIcon color="info" /> },
  { label: 'Pain Episodes Today', unit: '', icon: <PainIcon color="secondary" /> }
];

const Dashboard = () => {
  const [vitals, setVitals] = useState({
    heartRate: 82,
    oxygen: 97,
    temperature: 36.7,
    hydration: 78,
    pain: 1
  });

  const [crisis, setCrisis] = useState(false);

  useEffect(() => {
    const simulateVitals = () => {
      const simulated = {
        heartRate: Math.floor(Math.random() * 20) + 80,
        oxygen: Math.floor(Math.random() * 5) + 94,
        temperature: (Math.random() * 1.5 + 36.5).toFixed(1),
        hydration: Math.floor(Math.random() * 20) + 60,
        pain: Math.floor(Math.random() * 3)
      };
      setVitals(simulated);
      const isCrisis =
        simulated.heartRate > VITAL_THRESHOLDS.heartRate ||
        simulated.oxygen < VITAL_THRESHOLDS.oxygen ||
        simulated.temperature > VITAL_THRESHOLDS.temperature ||
        simulated.hydration < VITAL_THRESHOLDS.hydration;
      setCrisis(isCrisis);
    };

    const interval = setInterval(simulateVitals, 5000);
    simulateVitals();
    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      <Typography variant="h4" mb={2}>Welcome to Cell Sense</Typography>
      {crisis && (
        <Alert severity="error" sx={{ mb: 3 }}>
          ⚠️ Your vitals indicate a possible crisis. Please rest and stay hydrated.
        </Alert>
      )}

      <Grid container spacing={3}>
        {Object.entries(vitals).map(([key, value], index) => {
          const { label, unit, icon } = vitalsMeta[index];
          return (
            <Grid item xs={12} md={6} lg={4} key={key}>
              <Card sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                {icon}
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">{label}</Typography>
                  <Typography variant="h5">{value} {unit}</Typography>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box mt={5}>
        <Typography variant="h6" gutterBottom>Quick Recommendations</Typography>
        <ul>
          <li>🧴 Stay hydrated — target 2L today</li>
          <li>🧘‍♀️ Do breathing exercises 2x today</li>
          <li>💊 Take morning meds if not yet done</li>
        </ul>
      </Box>
    </Box>
  );
};

export default Dashboard;

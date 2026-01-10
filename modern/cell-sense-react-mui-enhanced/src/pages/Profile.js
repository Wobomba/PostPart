import React, { useState, useEffect } from 'react';
import { TextField, Button, Typography, Grid, Card, Avatar } from '@mui/material';

const Profile = () => {
  const [user, setUser] = useState({ name: '', email: '', profilePic: '' });
  const [password, setPassword] = useState('');
  const [pic, setPic] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('✅ Profile updated! (simulate)');
    setPassword('');
    setPic(null);
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>Profile Settings</Typography>
      <Card sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Avatar
                src={user.profilePic || 'default.jpg'}
                sx={{ width: 100, height: 100, margin: '0 auto', mb: 2 }}
              />
              <Button variant="contained" component="label">
                Upload Picture
                <input type="file" hidden onChange={(e) => setPic(e.target.files[0])} />
              </Button>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                label="Full Name"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Email"
                type="email"
                value={user.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />
              <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
                Save Changes
              </Button>
            </Grid>
          </Grid>
        </form>
      </Card>
    </div>
  );
};

export default Profile;

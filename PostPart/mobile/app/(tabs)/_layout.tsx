import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide tab bar completely
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="centers" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}


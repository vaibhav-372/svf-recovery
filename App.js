import React from 'react';
import { ImageBackground, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import tw from 'tailwind-react-native-classnames';
import { SafeAreaView } from 'react-native-safe-area-context';
import Home from './home/home';
import { StatusBar } from 'expo-status-bar';
import Customers from './customers/Customers';
import History from './history/History';
import Settings from './settingsPage/Settings';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {/* <ImageBackground
        source={require('./assets/bg.jpg')}
        style={{ flex: 1 }}
        resizeMode="cover"
      > */}
        <SafeAreaView style={{ flex: 1 }}>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: '#7cc0d8',
              tabBarInactiveTintColor: '#7cc0d8',
              tabBarLabelStyle: { fontSize: 12 },
              tabBarStyle: {
                // backgroundColor: 'rgba(255, 255, 255, 0.9)',
                paddingBottom: 6,
                height: 60,
                borderTopWidth: 0,
              },
              tabBarIcon: ({ focused, color, size }) => {
                let iconName = 'help-circle-outline';

                if (route?.name === 'Home') {
                  iconName = focused ? 'home' : 'home-outline';
                } else if (route?.name === 'Customers') {
                  iconName = focused ? 'people' : 'people-outline';
                } else if (route?.name === 'Hist') {
                  iconName = focused ? 'time' : 'time-outline';
                } else if (route?.name === 'Settings') {
                  iconName = focused ? 'settings' : 'settings-outline';
                }

                return <Ionicons name={iconName} size={20} color={color} />;
              },
            })}
          >
            <Tab.Screen name="Home" component={Home} />
            <Tab.Screen name="Customers" component={Customers} />
            <Tab.Screen name="Hist" component={History} />
            <Tab.Screen name="Settings" component={Settings} />
          </Tab.Navigator>
        </SafeAreaView>
      {/* </ImageBackground> */}
    </NavigationContainer>
  );
}

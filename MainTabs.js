// MainTabs.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Home from "./home/Home";
import Customers from "./customers/Customers";
import History from "./history/History";
import Settings from "./settingsPage/Settings";
import { StatusBar } from "react-native";

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar
        barStyle="light-content" 
        backgroundColor="#000" 
      />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#7cc0d8",
          tabBarInactiveTintColor: "#7cc0d8",
          tabBarLabelStyle: { fontSize: 12 },
          tabBarStyle: {
            paddingBottom: 6,
            height: 60,
            borderTopWidth: 0,
          },
          tabBarIcon: ({ focused, color }) => {
            let iconName = "help-circle-outline";

            if (route.name === "Home") {
              iconName = focused ? "home" : "home-outline";
            } else if (route.name === "Customers") {
              iconName = focused ? "people" : "people-outline";
            } else if (route.name === "Hist") {
              iconName = focused ? "time" : "time-outline";
            } else if (route.name === "Settings") {
              iconName = focused ? "settings" : "settings-outline";
            }

            return <Ionicons name={iconName} size={20} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={Home} />
        <Tab.Screen 
          name="Customers" 
          component={Customers}
          initialParams={{ initialTab: "pending" }}
        />
        <Tab.Screen name="Hist" component={History} />
        <Tab.Screen name="Settings" component={Settings} />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default MainTabs;
// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "./context/AuthContext";
import MainTabs from "./MainTabs";
import CameraComponent from "./customers/CameraComponent";
import LoginScreen from "./screens/LoginScreen";
import { ActivityIndicator, View, Text, Image } from "react-native";

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "white",
    }}
  >
    {/* <ActivityIndicator size="large" color="#7cc0d8" /> */}
    {/* <Text style={{ marginTop: 10, color: "#7cc0d8", fontSize: 16 }}>
      Checking authentication...
    </Text> */}
    <Image
      source={require("./assets/kohli.webp")}
      style={{ width: 140, height: 140, borderRadius: 50 }}
    />
  </View>
);

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Camera" component={CameraComponent} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

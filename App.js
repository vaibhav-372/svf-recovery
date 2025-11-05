// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "./context/AuthContext";
import MainTabs from "./MainTabs";
import CameraComponent from "./customers/CameraComponent";
import LoginScreen from "./screens/LoginScreen";
import {
  ActivityIndicator,
  View,
  Text,
  Image,
  BackHandler,
  TouchableOpacity,
} from "react-native";
import Customers from "./customers/Customers";

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
    <Image
      source={require("./assets/kohli.webp")}
      style={{ width: 140, height: 140, borderRadius: 50, marginBottom: 20 }}
    />
    <ActivityIndicator size="large" color="#7cc0d8" />
    <Text style={{ marginTop: 10, color: "#7cc0d8", fontSize: 16 }}>
      Loading...
    </Text>
  </View>
);

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Error Boundary Caught:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleExit = () => {
    BackHandler.exitApp();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: "white",
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              marginBottom: 10,
              color: "#ef4444",
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{ textAlign: "center", marginBottom: 20, color: "#6b7280" }}
          >
            The app encountered an unexpected error.
          </Text>

          <View style={{ flexDirection: "row", marginTop: 20 }}>
            <TouchableOpacity
              onPress={this.handleReset}
              style={{
                backgroundColor: "#7cc0d8",
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 5,
                marginRight: 10,
              }}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Try Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={this.handleExit}
              style={{
                backgroundColor: "#ef4444",
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 5,
              }}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Exit App
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const AppNavigator = () => {
  const { isAuthenticated, loading, error } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 18, color: "#ef4444", marginBottom: 10 }}>
          Authentication Error
        </Text>
        <Text style={{ textAlign: "center", color: "#6b7280" }}>{error}</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="Camera"
            component={CameraComponent}
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            animation: "fade",
          }}
        />
      )}
    </Stack.Navigator>
  );
};

const NavigationContainerWithErrorHandling = ({ children }) => {
  const [navigationReady, setNavigationReady] = React.useState(false);
  const [navigationError, setNavigationError] = React.useState(null);

  const handleNavigationReady = () => {
    setNavigationReady(true);
    setNavigationError(null);
  };

  const handleNavigationError = (error) => {
    console.error("Navigation Error:", error);
    setNavigationError(error);
    setNavigationReady(false);
  };

  if (navigationError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 18, color: "#ef4444", marginBottom: 10 }}>
          Navigation Error
        </Text>
        <Text
          style={{ textAlign: "center", color: "#6b7280", marginBottom: 20 }}
        >
          There was a problem with navigation. Please restart the app.
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      onReady={handleNavigationReady}
      onError={handleNavigationError}
      fallback={<LoadingScreen />}
    >
      {children}
    </NavigationContainer>
  );
};

// Enhanced App component with better initialization
export default function App() {
  const [appReady, setAppReady] = React.useState(false);
  const [appError, setAppError] = React.useState(null);
  const [initializationStep, setInitializationStep] =
    React.useState("Starting...");

  React.useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        console.log("App initialization started");
        setInitializationStep("Initializing app...");

        // Remove the timeout race condition and use simpler initialization
        // Just simulate a short loading time
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (!mounted) return;

        setInitializationStep("Setting up services...");

        // Add any actual initialization logic here
        // For example:
        // await initializeDatabase();
        // await loadCachedData();

        if (!mounted) return;

        setAppReady(true);
        console.log("App initialization completed successfully");
      } catch (error) {
        console.error("App initialization error:", error);
        if (mounted) {
          setAppError(error.message || "Initialization failed");
          setAppReady(true); // Still show UI even with error
        }
      }
    };

    initializeApp();

    // Set up global error handler (React Native way)
    const errorHandler = (error, isFatal) => {
      console.log("Global Error Handler:", error, isFatal);
      if (isFatal && mounted) {
        setAppError("A fatal error occurred");
      }
    };

    // Set the global error handler
    if (global.ErrorUtils) {
      const originalHandler = global.ErrorUtils.getGlobalHandler();
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        errorHandler(error, isFatal);
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    // Handle promise rejections to prevent unhandled promise warnings
    const handlePromiseRejection = (event) => {
      console.log("Unhandled Promise Rejection:", event);
      // You can handle promise rejections here if needed
    };

    // Cleanup function
    return () => {
      mounted = false;
      // Restore original error handler if needed
      if (global.ErrorUtils && global.ErrorUtils.getGlobalHandler) {
        // Note: In practice, you might want to keep your handler
      }
    };
  }, []);

  // Enhanced loading screen with step information
  if (!appReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "white",
        }}
      >
        <Image
          source={require("./assets/kohli.webp")}
          style={{
            width: 140,
            height: 140,
            borderRadius: 50,
            marginBottom: 20,
          }}
        />
        {/* <ActivityIndicator size="large" color="#7cc0d8" />
        <Text style={{ marginTop: 10, color: "#7cc0d8", fontSize: 16 }}>
          {initializationStep}
        </Text> */}
      </View>
    );
  }

  if (appError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 18, color: "#ef4444", marginBottom: 10 }}>
          Initialization Error
        </Text>
        <Text
          style={{ textAlign: "center", color: "#6b7280", marginBottom: 20 }}
        >
          {appError}
        </Text>
        <TouchableOpacity
          onPress={() => setAppError(null)}
          style={{
            backgroundColor: "#7cc0d8",
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 5,
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            Continue Anyway
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <NavigationContainerWithErrorHandling>
          <AppNavigator />
        </NavigationContainerWithErrorHandling>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

// CameraComponent.js
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as ImageManipulator from "expo-image-manipulator";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";

export default function CameraComponent({ onCapture, onClose }) {
  const [loading, setLoading] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  const checkLocationPermission = async () => {
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Location Required",
          "This app needs access to your location to capture images with GPS coordinates. Please enable location services.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: onClose,
            },
            {
              text: "Enable Location",
              onPress: async () => {
                // Request location permission
                const newStatus = await Location.requestForegroundPermissionsAsync();
                if (newStatus.status === "granted") {
                  setLocationPermissionGranted(true);
                } else {
                  // Open settings if permission still not granted
                  if (Platform.OS === "ios") {
                    Linking.openURL("app-settings:");
                  } else {
                    Linking.openSettings();
                  }
                  Alert.alert(
                    "Location Disabled",
                    "Cannot capture image without location permission. Please enable location services in settings and try again.",
                    [{ text: "OK", onPress: onClose }]
                  );
                }
              },
            },
          ]
        );
        return false;
      }
      setLocationPermissionGranted(true);
      return true;
    } catch (error) {
      console.error("Error checking location permission:", error);
      return false;
    }
  };

  const takePhoto = async () => {
    setLoading(true);
    
    try {
      // Check location permission first
      const hasLocationPermission = await checkLocationPermission();
      if (!hasLocationPermission) {
        setLoading(false);
        return;
      }

      // Request camera permission
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPerm.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Camera permission is required to take pictures.",
          [{ text: "OK", onPress: onClose }]
        );
        setLoading(false);
        return;
      }

      // Use lower quality and resize to ensure small file size
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.5, // Lower quality for smaller files
        exif: false,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        setLoading(false);
        onClose();
        return;
      }

      // Resize and compress the image
      const compressedResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }], // Resize to max width 800px
        { 
          compress: 0.6, 
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );

      // Get location - now we know permission is granted
      let locationData = null;
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 10000, // 10 second timeout
        });
        locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        console.log("Location captured:", locationData);
      } catch (locationError) {
        console.log("Location access failed:", locationError);
        Alert.alert(
          "Location Error",
          "Could not get your current location. Please make sure location services are enabled and try again.",
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }

      // Pass captured data back
      onCapture({ 
        imageUri: compressedResult.uri, 
        location: locationData 
      });
      
      setLoading(false);
      onClose();

    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert(
        "Error",
        "Error capturing image. Please try again.",
        [{ text: "OK", onPress: onClose }]
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-start camera when component mounts
    takePhoto();
  }, []);

  return (
    <View style={[tw`flex-1 bg-black`, { paddingTop: 40 }]}>
      {/* Header */}
      <View style={tw`flex-row justify-between items-center px-4 py-2`}>
        <TouchableOpacity onPress={onClose} style={tw`p-2`}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text style={tw`text-white text-lg font-bold`}>Take Photo</Text>
        <View style={tw`w-8`} /> {/* Spacer for alignment */}
      </View>

      {/* Main Content */}
      <View style={tw`flex-1 justify-center items-center`}>
        {loading ? (
          <View style={tw`items-center`}>
            <ActivityIndicator size="large" color="white" />
            <Text style={tw`text-white mt-4 text-lg`}>
              {locationPermissionGranted ? "Capturing photo..." : "Checking location..."}
            </Text>
            {!locationPermissionGranted && (
              <Text style={tw`text-gray-300 mt-2 text-sm text-center px-8`}>
                Please grant location permission to continue
              </Text>
            )}
          </View>
        ) : (
          <View style={tw`items-center`}>
            <Ionicons name="camera" size={64} color="white" />
            <Text style={tw`text-white mt-4 text-lg`}>Camera</Text>
            <Text style={tw`text-gray-300 mt-2 text-sm text-center px-8`}>
              Camera will open automatically. Make sure location is enabled.
            </Text>
            
            <TouchableOpacity
              onPress={takePhoto}
              style={tw`mt-8 bg-blue-600 px-6 py-3 rounded-full`}
            >
              <Text style={tw`text-white text-lg font-bold`}>Take Photo Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Status Indicator */}
      <View style={tw`p-4`}>
        <View style={tw`flex-row items-center mb-2`}>
          <Ionicons
            name={locationPermissionGranted ? "checkmark-circle" : "location-outline"}
            size={20}
            color={locationPermissionGranted ? "#10b981" : "#9ca3af"}
          />
          <Text style={tw`text-white ml-2`}>
            Location: {locationPermissionGranted ? "Enabled" : "Required"}
          </Text>
        </View>
        <Text style={tw`text-gray-400 text-xs`}>
          Photos are automatically compressed to save storage space.
        </Text>
      </View>
    </View>
  );
}
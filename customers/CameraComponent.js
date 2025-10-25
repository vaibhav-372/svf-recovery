import React, { useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as ImageManipulator from 'expo-image-manipulator';

export default function CameraComponent({ onCapture, onClose }) {
  useEffect(() => {
    (async () => {
      try {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        const locationPerm = await Location.requestForegroundPermissionsAsync();

        if (!cameraPerm.granted) {
          alert("Camera permission is required to take pictures.");
          onClose();
          return;
        }

        // Use lower quality and resize to ensure small file size
        const result = await ImagePicker.launchCameraAsync({
          quality: 0.5, // Lower quality for smaller files
          exif: false,
          allowsEditing: false,
        });

        if (result.canceled || !result.assets?.[0]?.uri) {
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

        // Get location
        let locationData = null;
        if (locationPerm.granted) {
          try {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            locationData = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
          } catch (error) {
            console.log("Location access failed");
          }
        }

        onCapture({ 
          imageUri: compressedResult.uri, 
          location: locationData 
        });
        onClose();

      } catch (error) {
        console.error("Camera error:", error);
        alert("Error capturing image. Please try again.");
        onClose();
      }
    })();
  }, []);

  return null;
}
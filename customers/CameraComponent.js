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






// import React, { useEffect, useState } from "react";
// import * as ImagePicker from "expo-image-picker";
// import * as Location from "expo-location";
// import * as ImageManipulator from 'expo-image-manipulator';
// import { 
//   View, 
//   Text, 
//   TouchableOpacity, 
//   ActivityIndicator, 
//   Modal,
//   StyleSheet,
//   SafeAreaView 
// } from "react-native";

// export default function CameraComponent({ onCapture, onClose }) {
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [permissionsGranted, setPermissionsGranted] = useState(false);

//   useEffect(() => {
//     checkPermissions();
//   }, []);

//   const checkPermissions = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       // Check camera permissions first
//       const cameraPerm = await ImagePicker.getCameraPermissionsAsync();
//       if (!cameraPerm.granted) {
//         const newCameraPerm = await ImagePicker.requestCameraPermissionsAsync();
//         if (!newCameraPerm.granted) {
//           setError("Camera permission is required to take pictures.");
//           return;
//         }
//       }

//       // Check location permissions (optional)
//       const locationPerm = await Location.getForegroundPermissionsAsync();
//       if (!locationPerm.granted) {
//         await Location.requestForegroundPermissionsAsync();
//         // Continue even if location permission is denied
//       }

//       setPermissionsGranted(true);
//     } catch (error) {
//       console.error("Permission error:", error);
//       setError("Failed to get required permissions.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const openCamera = async () => {
//     try {
//       setLoading(true);
      
//       // Use safer camera launch with timeout
//       const cameraPromise = ImagePicker.launchCameraAsync({
//         quality: 0.5,
//         exif: false,
//         allowsEditing: false,
//         cameraType: ImagePicker.CameraType.back,
//       });

//       // Add timeout to prevent hanging
//       const timeoutPromise = new Promise((_, reject) => 
//         setTimeout(() => reject(new Error('Camera timeout')), 100000)
//       );

//       const result = await Promise.race([cameraPromise, timeoutPromise]);

//       if (result.canceled || !result.assets?.[0]?.uri) {
//         onClose();
//         return;
//       }

//       // Process image with error handling
//       let processedUri = result.assets[0].uri;
//       try {
//         const compressedResult = await ImageManipulator.manipulateAsync(
//           result.assets[0].uri,
//           [{ resize: { width: 800 } }],
//           { 
//             compress: 0.6, 
//             format: ImageManipulator.SaveFormat.JPEG 
//           }
//         );
//         processedUri = compressedResult.uri;
//       } catch (compressError) {
//         console.log("Image compression failed, using original:", compressError);
//         // Continue with original image if compression fails
//       }

//       // Get location (optional)
//       let locationData = null;
//       try {
//         const locationPerm = await Location.getForegroundPermissionsAsync();
//         if (locationPerm.granted) {
//           const location = await Location.getCurrentPositionAsync({
//             accuracy: Location.Accuracy.Balanced,
//             timeout: 5000, // 5 second timeout
//           });
//           locationData = {
//             latitude: location.coords.latitude,
//             longitude: location.coords.longitude,
//           };
//         }
//       } catch (locationError) {
//         console.log("Location access failed:", locationError);
//         // Continue without location
//       }

//       onCapture({ 
//         imageUri: processedUri, 
//         location: locationData 
//       });
//       onClose();

//     } catch (error) {
//       console.error("Camera error:", error);
//       setError(`Camera error: ${error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleRetry = () => {
//     setError(null);
//     checkPermissions();
//   };

//   // If loading and permissions are granted, automatically open camera
//   useEffect(() => {
//     if (permissionsGranted && !loading && !error) {
//       openCamera();
//     }
//   }, [permissionsGranted, loading, error]);

//   return (
//     <Modal
//       visible={true}
//       animationType="slide"
//       presentationStyle="pageSheet"
//       onRequestClose={onClose}
//     >
//       <SafeAreaView style={styles.container}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={onClose} style={styles.closeButton}>
//             <Text style={styles.closeButtonText}>✕</Text>
//           </TouchableOpacity>
//           <Text style={styles.title}>Camera</Text>
//           <View style={styles.placeholder} />
//         </View>

//         <View style={styles.content}>
//           {loading && (
//             <View style={styles.centerContent}>
//               <ActivityIndicator size="large" color="#7cc0d8" />
//               <Text style={styles.loadingText}>
//                 {permissionsGranted ? "Opening camera..." : "Checking permissions..."}
//               </Text>
//             </View>
//           )}

//           {error && (
//             <View style={styles.centerContent}>
//               <Text style={styles.errorText}>{error}</Text>
              
//               <View style={styles.buttonContainer}>
//                 <TouchableOpacity 
//                   style={[styles.button, styles.retryButton]} 
//                   onPress={handleRetry}
//                 >
//                   <Text style={styles.buttonText}>Try Again</Text>
//                 </TouchableOpacity>
                
//                 <TouchableOpacity 
//                   style={[styles.button, styles.closeButton]} 
//                   onPress={onClose}
//                 >
//                   <Text style={styles.buttonText}>Close</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}

//           {!loading && !error && permissionsGranted && (
//             <View style={styles.centerContent}>
//               <Text style={styles.instructionText}>
//                 Camera should open automatically. If not, tap the button below.
//               </Text>
//               <TouchableOpacity 
//                 style={styles.cameraButton} 
//                 onPress={openCamera}
//               >
//                 <Text style={styles.cameraButtonText}>Open Camera</Text>
//               </TouchableOpacity>
//             </View>
//           )}
//         </View>
//       </SafeAreaView>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'white',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f0f0',
//   },
//   closeButton: {
//     padding: 8,
//   },
//   closeButtonText: {
//     fontSize: 20,
//     color: '#333',
//   },
//   title: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   placeholder: {
//     width: 36,
//   },
//   content: {
//     flex: 1,
//     justifyContent: 'center',
//     padding: 20,
//   },
//   centerContent: {
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   loadingText: {
//     marginTop: 16,
//     fontSize: 16,
//     color: '#666',
//     textAlign: 'center',
//   },
//   errorText: {
//     fontSize: 16,
//     color: '#ef4444',
//     textAlign: 'center',
//     marginBottom: 24,
//   },
//   instructionText: {
//     fontSize: 16,
//     color: '#666',
//     textAlign: 'center',
//     marginBottom: 24,
//   },
//   buttonContainer: {
//     flexDirection: 'row',
//     gap: 12,
//   },
//   button: {
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderRadius: 8,
//     minWidth: 100,
//     alignItems: 'center',
//   },
//   retryButton: {
//     backgroundColor: '#7cc0d8',
//   },
//   closeButton: {
//     backgroundColor: '#6b7280',
//   },
//   buttonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
//   cameraButton: {
//     backgroundColor: '#7cc0d8',
//     paddingHorizontal: 24,
//     paddingVertical: 12,
//     borderRadius: 8,
//   },
//   cameraButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
// });
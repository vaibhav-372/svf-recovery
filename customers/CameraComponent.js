import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import tw from 'tailwind-react-native-classnames';

export default function CameraComponent({ onCapture, onClose }) {
  const [image, setImage] = React.useState(null);

  useEffect(() => {
    openCamera(); // directly open camera on mount
  }, []);

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is needed to take pictures.');
      onClose(); // close modal if permission denied
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      onClose
    });

    console.log("Camera result: ", result);

    if (!result.canceled) {
      const uri = result.assets ? result.assets[0].uri : result.uri;
      setImage(uri);
      if (onCapture) {
        onCapture(uri);
      }
    } else {
      onClose(); // close if user cancels
    }
  };

  useEffect(() => {
    onClose()
  }, [image])
  

  return (
    <View style={tw`flex-1 justify-center items-center bg-white px-4`}>
      {image ? (
        <>
          <Image
            source={{ uri: image }}
            style={tw`w-3/4 h-3/4`}
            resizeMode="contain"
          />

          <TouchableOpacity
            onPress={onClose}
            style={tw`bg-green-500 px-6 py-3 rounded-full mt-4`}
          >
            <Text style={tw`text-white font-bold`}>Done</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={tw`text-lg text-gray-700`}>Loading camera...</Text>
      )}
    </View>
  );
}

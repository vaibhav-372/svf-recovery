import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Dimensions } from 'react-native';
import tw from 'tailwind-react-native-classnames';

const { height } = Dimensions.get('window');

const DetailedHist = ({ person, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(height)).current; // slide up from bottom

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!person) return null;

  return (
    <Animated.View
      style={[
        tw`absolute top-0 left-0 right-0 bottom-0`,
        {
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: fadeAnim,
          transform: [{ translateY: translateYAnim }],
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}
    >
      <View style={[tw`bg-white rounded-t-3xl w-full h-full p-6`, { paddingTop: 40 }]}>
        <Text style={[tw`text-center text-3xl font-bold mb-6`, { color: '#7cc0d8' }]}>
          {person.name}
        </Text>

        <View style={tw`px-4`}>
          <Text style={tw`text-lg mb-4`}>
            <Text style={tw`font-bold text-gray-800`}>Number: </Text>
            <Text style={tw`text-gray-700`}>{person.number}</Text>
          </Text>

          <Text style={tw`text-lg mb-4`}>
            <Text style={tw`font-bold text-gray-800`}>Area: </Text>
            <Text style={tw`text-gray-700`}>{person.area}</Text>
          </Text>

          <Text style={tw`text-lg mb-4`}>
            <Text style={tw`font-bold text-gray-800`}>Amount: </Text>
            <Text style={tw`text-gray-700`}>{person.amount}</Text>
          </Text>

          <Text style={tw`text-lg mb-4`}>
            <Text style={tw`font-bold text-gray-800`}>Date: </Text>
            <Text style={tw`text-gray-700`}>{person.date}</Text>
          </Text>
        </View>

        <Pressable
          onPress={onClose}
          style={[
            tw`absolute bottom-10 self-center rounded-full px-10 py-3`,
            { backgroundColor: '#7cc0d8' },
          ]}
        >
          <Text style={tw`text-white text-lg font-bold`}>Close</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

export default DetailedHist;
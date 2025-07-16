import { View, Text } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'tailwind-react-native-classnames';

const Customers = () => {
  return (
  <SafeAreaView style={tw`flex-1 items-center justify-center`}>
    <Text style={tw`text-lg`}>Customers Screen</Text>
  </SafeAreaView>
); 
}

export default Customers
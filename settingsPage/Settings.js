import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'tailwind-react-native-classnames';

const Settings = () => {
  return (
  <SafeAreaView style={tw`flex-1 items-center justify-center`}>
    <Text style={tw`text-lg`}>Settings Screen</Text>
  </SafeAreaView>
);
}

export default Settings
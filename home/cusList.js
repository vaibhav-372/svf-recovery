import { View, Text } from 'react-native';
import React from 'react';
import tw from 'tailwind-react-native-classnames';
import { useNavigation } from '@react-navigation/native';

const CusList = () => {

  const navigation = useNavigation();

  const people = [
    { id: 1, number: 9999999999, name: 'Vaibhav', area: 'Rjy' },
    { id: 2, number: 9999999999, name: 'Prasad', area: 'Dwl' },
    { id: 3, number: 9999999999, name: 'Kiran', area: 'Rjn' },
    { id: 4, number: 9999999999, name: 'Pavan', area: 'Kkd' },
    { id: 5, number: 9999999999, name: 'Raju', area: 'Rjy' },
  ];

    const handleViewMore = () => {
    navigation.navigate('Customers');
  };

  return (
    <View style={[tw`p-2 m-2 `, { borderColor: '#7cc0d8' }]}>
      <Text style={tw`text-lg font-bold mb-4`}>Customer List</Text>

      {people.map((person) => (
        <View
          key={person.id}
          style={[
            tw`flex-row justify-between items-center p-2 border-b`,
            { borderBottomColor: '#7cc0d8' }
          ]}        >
          <Text style={tw`flex-1 text-sm`}>{person.name}</Text>
          <Text style={tw`flex-1 text-sm text-center`}>{person.number}</Text>
          <Text style={tw`flex-1 text-sm text-right`}>{person.area}</Text>
        </View>
      ))}
      <Text 
      onPress={handleViewMore}
      style={[tw`text-right font-bold p-2 text-sm`,
      {color:'#3490b0'}]}>
        view more...
        </Text>
    </View>
  );
};

export default CusList;

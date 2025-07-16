import { View, Text, TouchableOpacity, Modal } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import DetailedHist from './detailedHist';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';

const HomeHist = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const navigation = useNavigation();

  const people = [
    { name: 'Vaibhav', number: 9999999999, area: 'Rajahmundry', amount: 60000, date: '16 jul 2025' },
    { name: 'Prasad', number: 9999999999, area: 'Dawaleshwaram', amount: 60000, date: '16 jul 2025' },
    { name: 'Kiran', number: 9999999999, area: 'Rajanagaram', amount: 60000, date: '16 jul 2025' },
    { name: 'Pavan', number: 9999999999, area: 'Kakinada', amount: 60000, date: '16 jul 2025' },
    { name: 'Raju', number: 9999999999, area: 'Rajahmundry', amount: 60000, date: '16 jul 2025' },
  ];

  const handlePress = (person) => {
    setSelectedPerson(person);
    setModalVisible(true);
  };

  const handleViewMore = () => {
    navigation.navigate('Hist');
  };

  return (
    <View style={tw`p-4`}>
      <Text style={tw`text-xl font-bold mb-4`}>History</Text>

      {people.map((person, index) => (
        <TouchableOpacity key={index} onPress={() => handlePress(person)}>
          <View
            style={[
              tw`bg-white p-2 mb-3 rounded-lg shadow flex flex-row justify-between`,
              { borderLeftWidth: 5, borderLeftColor: '#7cc0d8', elevation: 5 },
            ]}
          >
            <View>
              <Text style={tw`text-lg font-bold`}>{person.name}</Text>
              <Text style={tw`text-sm font-semibold text-gray-700`}>{person.number}</Text>
              <Text style={tw`text-xs text-gray-700`}>{person.date}</Text>
            </View>
            <View style={tw`flex justify-center items-end`}>
              <Text style={tw`text-lg font-bold text-gray-700`}>{person.amount}</Text>
              <Text style={tw`text-sm text-gray-700`}>{person.area}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      <Text
        onPress={handleViewMore}
        style={[
          tw`text-right font-bold text-sm mt-2`,
          { color: '#3490b0' },
        ]}
      >
        view more...
      </Text>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <DetailedHist
          person={selectedPerson}
          onClose={() => setModalVisible(false)}
        />
      </Modal>
    </View>
  );
};

export default HomeHist;

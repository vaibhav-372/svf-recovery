import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import React, { useState } from 'react';
import tw from 'tailwind-react-native-classnames';
import DetailedHist from '../home/detailedHist';
import DetailedCust from './DetailedCust';
import CustomerData from './Cust.json';

const Customers = () => {
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState(null);

  // const people = [
  //   { id: 1, number: 9999999999, name: 'Vaibhav', amount:90000, area: 'Rajahmundry', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:1, },
  //   { id: 2, number: 9999999999, name: 'Prasad', amount:90000, area: 'Dawaleshwaram', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 3, number: 9999999999, name: 'Kiran', amount:90000, area: 'Rajanagaram', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 4, number: 9999999999, name: 'Pavan', amount:90000, area: 'Kakinada', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 5, number: 9999999999, name: 'Raju', amount:90000, area: 'Rajahmundry', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:1, },
  //   { id: 6, number: 9999999999, name: 'Vaibhav', amount:90000, area: 'Rajahmundry', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:1, },
  //   { id: 7, number: 9999999999, name: 'Prasad', amount:90000, area: 'Dawaleshwaram', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 8, number: 9999999999, name: 'Kiran', amount:90000, area: 'Rajanagaram', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 9, number: 9999999999, name: 'Pavan', amount:90000, area: 'Kakinada', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 10, number: 9999999999, name: 'Raju', amount:90000, area: 'Rajahmundry', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:1, },
  //   { id: 11, number: 9999999999, name: 'Vaibhav', amount:90000, area: 'Rajahmundry', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:1, },
  //   { id: 12, number: 9999999999, name: 'Prasad', amount:90000, area: 'Dawaleshwaram', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 13, number: 9999999999, name: 'Kiran', amount:90000, area: 'Rajanagaram', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 14, number: 9999999999, name: 'Pavan', amount:90000, area: 'Kakinada', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 15, number: 9999999999, name: 'Raju', amount:90000, area: 'Rajahmundry', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:1, },
  //   { id: 16, number: 9999999999, name: 'Vaibhav', amount:90000, area: 'Rajahmundry', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:1, },
  //   { id: 17, number: 9999999999, name: 'Prasad', amount:90000, area: 'Dawaleshwaram', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 18, number: 9999999999, name: 'Kiran', amount:90000, area: 'Rajanagaram', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 19, number: 9999999999, name: 'Pavan', amount:90000, area: 'Kakinada', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 20, number: 9999999999, name: 'Raju', amount:90000, area: 'Rajahmundry', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:1, },
  //   { id: 21, number: 9999999999, name: 'Vaibhav', amount:90000, area: 'Rajahmundry', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:1, },
  //   { id: 22, number: 9999999999, name: 'Prasad', amount:90000, area: 'Dawaleshwaram', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 23, number: 9999999999, name: 'Kiran', amount:90000, area: 'Rajanagaram', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 24, number: 9999999999, name: 'Pavan', amount:90000, area: 'Kakinada', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:0, },
  //   { id: 25, number: 9999999999, name: 'Raju', amount:90000, area: 'Rajahmundry', date:"16 july 2025", jama:40000, loanCreated:"24 nov 2023", tenure:12, ornament:"2 bangles and 1 ring", visited:1, },
  // ];
  
    const handlePress = (person) => {
    setSelectedPerson(person);
    setModalVisible(true);
  };

  return (
    <ScrollView style={[tw`flex-1 bg-white`, { borderColor: '#7cc0d8' }]}>
      <View style={tw`p-2 m-2`}>
        <Text style={tw`text-xl font-bold mb-4 text-center`}>Customer List</Text>

        <View style={tw`flex-row border-b pb-2 mb-2 border-gray-300`}>
          <Text style={tw`flex-1 text-sm font-bold`}>Name</Text>
          <Text style={tw`flex-1 text-sm font-bold text-center`}>Number</Text>
          <Text style={tw`flex-1 text-sm font-bold text-center`}>Area</Text>
          <Text style={tw` text-sm font-bold text-center`}>Status</Text>
        </View>

        {CustomerData.map((person) => (
          <TouchableOpacity
            onPress={() => handlePress(person)}
            key={person.id}
            style={[
              tw`flex-row justify-between items-center p-2 border-b`,
              { borderBottomColor: '#7cc0d8' },
            ]}
          >
            <Text style={tw`flex-1 text-sm`}>{person.name}</Text>
            <Text style={tw`flex-1 text-sm text-center`}>{person.number}</Text>
            <Text style={tw`flex-1 text-sm text-center`}>{person.area}</Text>
            <Text style={tw`text-sm text-center`}>
              {person.visited ? '✔️' : '❌'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <DetailedCust
          person={selectedPerson}
          onClose={() => setModalVisible(false)}
        />
      </Modal>
    </ScrollView>
  );
};

export default Customers;
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "tailwind-react-native-classnames";
import DetailedHist from "./DetailedHist";
import CustomerData from "../customers/Cust.json";
import { useState } from "react";

const History = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const handlePress = (person) => {
    setSelectedPerson(person);
    setModalVisible(true);
  };

  return (
    <ScrollView style={tw`flex-1 bg-white`}>
      <View style={tw`p-4`}>
        <Text style={tw`text-xl font-bold mb-4`}>History</Text>

        {CustomerData.map((person, index) => (
          <TouchableOpacity key={index} onPress={() => handlePress(person)}>
            <View
              style={[
                tw`bg-white p-2 mb-3 rounded-lg shadow flex flex-row justify-between`,
                {
                  borderLeftWidth: 5,
                  borderLeftColor: "#7cc0d8",
                  elevation: 5,
                },
              ]}
            >
              <View style={tw`flex-1`}>
                <Text style={tw`text-lg font-bold`}>{person.name}</Text>
                <Text style={tw`text-sm font-semibold text-gray-700`}>
                  {person.number}
                </Text>
                <Text style={tw`text-xs text-gray-700`}>{person.date}</Text>
              </View>
              
              <View style={tw`flex-1 items-end`}>
                <Text style={tw`text-lg font-bold text-gray-700`}>
                  {person.amount}
                </Text>
                <Text style={tw`text-sm text-gray-700`}>{person.city}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

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
    </ScrollView>
  );
};

export default History;

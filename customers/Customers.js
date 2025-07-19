import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput } from "react-native";
import React, { useState } from "react";
import tw from "tailwind-react-native-classnames";
import DetailedHist from "../history/detailedHist";
import DetailedCust from "./DetailedCust";
import CustomerData from "./Cust.json";
import { Ionicons } from "@expo/vector-icons";

const Customers = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const handlePress = (person) => {
    setSelectedPerson(person);
    setModalVisible(true);
  };

  return (
    <ScrollView style={[tw`flex-1 bg-white`, { borderColor: "#7cc0d8" }]}>
      <View style={tw`p-2 m-2`}>
        <Text style={tw`text-xl font-bold mb-4 text-center`}>
          Customer List
        </Text>

        <View
          style={tw`flex-row items-center bg-gray-100 rounded-full px-4 py-2 mx-4 my-2`}
        >
          <Ionicons name="search" size={20} color="gray" />
          <TextInput
            // value={value}
            // onChangeText={onChangeText}
            // placeholder={placeholder}
            style={tw`ml-2 flex-1 text-base`}
            // placeholderTextColor="gray"
          />
        </View>

        <View style={tw`flex-row border-b pb-2 mb-2 border-gray-300`}>
          <Text style={tw`flex-1 text-sm font-bold`}>Name</Text>
          <Text style={tw`flex-1 text-sm font-bold text-center`}>Number</Text>
          <Text style={tw`flex-1 text-sm font-bold text-center`}>City</Text>
          <Text style={tw` text-sm font-bold text-center`}>Status</Text>
        </View>

        {CustomerData.map((person) => (
          <TouchableOpacity
            onPress={() => handlePress(person)}
            key={person.id}
            style={[
              tw`flex-row justify-between items-center p-2 border-b`,
              { borderBottomColor: "#7cc0d8" },
            ]}
          >
            <Text style={tw`flex-1 text-sm`}>{person.name}</Text>
            <Text style={tw`flex-1 text-sm text-center`}>{person.number}</Text>
            <Text style={tw`flex-1 text-sm text-center`}>{person.area}</Text>
            <Text style={tw`text-sm text-center`}>
              {person.visited ? "✔️" : "❌"}
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

import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Platform,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import customerData from "../customers/Cust.json";
import DetailedCust from "../customers/DetailedCust";
import { useAuth } from "../context/AuthContext";

const Settings = () => {
  const profileImage = require("../assets/kohli.webp");

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDateText, setSelectedDateText] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: logout },
    ]);
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowPicker(Platform.OS === "ios");
    setDate(currentDate);

    if (selectedDate) {
      const formatted = `${currentDate.getDate()}-${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`;
      setSelectedDateText(formatted);
      setModalVisible(true); // Show modal after selecting date
    }
  };

  const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

  const openDetailedCust = (person) => {
    setSelectedPerson(person);
    setDetailModalVisible(true);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <View style={tw`items-center mt-10`}>
        <View>
          <Image
            source={profileImage}
            style={[
              tw`w-32 h-32 rounded-full`,
              { borderColor: "#000", borderWidth: 3 },
            ]}
          />
          <TouchableOpacity
            style={[tw`absolute bottom-0 right-0 bg-gray-200 p-2 rounded-full`]}
          >
            <Ionicons name="pencil" size={18} color="black" />
          </TouchableOpacity>
        </View>

        <View style={tw`w-full px-5 mt-10`}>
          <View
            style={tw`flex-row justify-between items-center border-b border-gray-300 py-3`}
          >
            <View>
              <Text style={tw`text-gray-600 text-sm font-bold`}>Name</Text>
              <Text
                style={[
                  tw`text-lg font-semibold text-gray-800`,
                  { color: "#7cc0d8" },
                ]}
              >
                Kohli
              </Text>
            </View>
          </View>

          <View
            style={tw`flex-row justify-between items-center border-b border-gray-300 py-3`}
          >
            <View>
              <Text style={tw`text-gray-600 text-sm font-bold`}>Number</Text>
              <Text
                style={[
                  tw`text-lg font-semibold text-gray-800`,
                  { color: "#7cc0d8" },
                ]}
              >
                +91 99999 99999
              </Text>
            </View>
          </View>

          {/* Reports with Date Picker */}
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={tw`flex-row justify-between items-center border-b border-gray-300 py-3`}
          >
            <View>
              <Text style={tw`text-gray-600 text-sm font-bold`}>Reports</Text>
              <Text
                style={[
                  tw`text-lg font-semibold text-gray-800`,
                  { color: "#7cc0d8" },
                ]}
              >
                {formattedDate}
              </Text>
            </View>
            <Ionicons name="pencil" size={20} color="#7cc0d8" />
          </TouchableOpacity>

          <View
            style={tw`flex-row justify-between items-center border-b border-gray-300 py-3`}
          >
            <Text style={tw`text-gray-600 text-sm font-bold`}>
              Total Visits
            </Text>
            <Text
              style={[
                tw`text-lg font-semibold text-gray-800`,
                { color: "#7cc0d8" },
              ]}
            >
              352
            </Text>
          </View>
          <View>
            <TouchableOpacity
              onPress={handleLogout}
              style={tw`bg-red-500 mt-5 py-2 rounded-full items-center`}
            >
              <Text style={tw`text-white font-bold`}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Modal for showing selected date and customer data */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}
        >
          <View style={tw`bg-white p-5 rounded-lg w-4/5`}>
            <Text style={tw`text-lg font-bold mb-3 text-center`}>
              Selected Date Report
            </Text>
            <Text style={tw`text-base mb-5 text-center`}>
              {selectedDateText}
            </Text>

            <ScrollView>
              {customerData.slice(0, 5).map((cust, index) => (
                <TouchableOpacity
                  key={index}
                  style={tw`border-b border-gray-200 py-2`}
                  onPress={() => {
                    setModalVisible(false);
                    openDetailedCust(cust);
                  }}
                >
                  <Text style={tw`text-base font-semibold`}>
                    PT.no: {cust.PtNo}
                  </Text>
                  <Text style={tw`text-base`}>Name: {cust.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={tw`bg-green-500 px-5 py-2 rounded-full mt-5 self-center`}
            >
              <Text style={tw`text-white font-bold`}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DetailedCust Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <DetailedCust
          person={selectedPerson}
          onClose={() => setDetailModalVisible(false)}
        />
      </Modal>
    </SafeAreaView>
  );
};

export default Settings;

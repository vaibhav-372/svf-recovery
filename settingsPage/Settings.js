import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
// import DetailedCust from "../customers/DetailedCust";
import { useAuth } from "../context/AuthContext";

const SERVER_IP = "192.168.65.11"
const BASE_URL = `http://${SERVER_IP}:3000`;

const Settings = () => {
  const profileImage = require("../assets/kohli.webp");

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState({
    name: "Loading...",
    mobile: "Loading...",
    totalVisits: 0,
    username: "",
  });

  const { user, logout } = useAuth();

  // Fetch current customer data on component mount
  useEffect(() => {
    fetchCurrentCustomer();
  }, []);

  const fetchCurrentCustomer = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BASE_URL}/api/settings-visits/${user.username}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch customer data");
      }

      const data = await response.json();
      setCurrentCustomer({
        name: data.name || "Not Available",
        mobile: data.mobile || "Not Available",
        totalVisits: data.totalVisits || 0,
        username: data.username || user.username || "Not Available",
      });
    } catch (error) {
      console.error("Error fetching customer:", error);
      Alert.alert("Error", "Failed to load customer data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: logout },
    ]);
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
          {/* Username Display */}
          <View
            style={tw`flex-row justify-between items-center border-b border-gray-300 py-3`}
          >
            <View>
              <Text style={tw`text-gray-600 text-sm font-bold`}>Username</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#7cc0d8" />
              ) : (
                <Text
                  style={[
                    tw`text-lg font-semibold text-gray-800`,
                    { color: "#7cc0d8" },
                  ]}
                >
                  {currentCustomer?.username}
                </Text>
              )}
            </View>
          </View>

          {/* Current Customer Info */}
          <View
            style={tw`flex-row justify-between items-center border-b border-gray-300 py-3`}
          >
            <View>
              <Text style={tw`text-gray-600 text-sm font-bold`}>Name</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#7cc0d8" />
              ) : (
                <Text
                  style={[
                    tw`text-lg font-semibold text-gray-800`,
                    { color: "#7cc0d8" },
                  ]}
                >
                  {currentCustomer?.name}
                </Text>
              )}
            </View>
          </View>

          <View
            style={tw`flex-row justify-between items-center border-b border-gray-300 py-3`}
          >
            <View>
              <Text style={tw`text-gray-600 text-sm font-bold`}>
                Mobile Number
              </Text>
              {loading ? (
                <ActivityIndicator size="small" color="#7cc0d8" />
              ) : (
                <Text
                  style={[
                    tw`text-lg font-semibold text-gray-800`,
                    { color: "#7cc0d8" },
                  ]}
                >
                  {currentCustomer?.mobile}
                </Text>
              )}
            </View>
          </View>

          <View
            style={tw`flex-row justify-between items-center border-b border-gray-300 py-3`}
          >
            <Text style={tw`text-gray-600 text-sm font-bold`}>
              Total Visits
            </Text>
            {loading ? (
              <ActivityIndicator size="small" color="#7cc0d8" />
            ) : (
              <Text
                style={[
                  tw`text-lg font-semibold text-gray-800`,
                  { color: "#7cc0d8" },
                ]}
              >
                {currentCustomer?.totalVisits}
              </Text>
            )}
          </View>

          {/* Logout Button */}
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

      {/* DetailedCust Modal */}
      {/* <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <DetailedCust
          person={selectedPerson}
          onClose={() => setDetailModalVisible(false)}
        />
      </Modal> */}
    </SafeAreaView>
  );
};

export default Settings;

// components/Customers.js
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import React, { useState, useEffect } from "react";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useRoute } from "@react-navigation/native";
import DetailedCust from "./DetailedCust";

const Customers = () => {
  const route = useRoute();
  const { user, token } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Configuration
  const SERVER_IP = "192.168.65.11";
  const BASE_URL = `http://${SERVER_IP}:3000/api`;
  const REQUEST_TIMEOUT = 10000;

  // Secure fetch wrapper
  const secureFetch = async (endpoint, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new Error("Request timeout. Please check your connection.");
      }

      throw error;
    }
  };

  // Helper function to check if customer is visited (handles both boolean and number)
  const isCustomerVisited = (customer) => {
    return (
      customer.isVisited === 1 ||
      customer.isVisited === true ||
      customer.visited === 1 ||
      customer.visited === true
    );
  };

  // Fetch customers independently
  const fetchCustomers = async () => {
    try {
      if (!token) {
        throw new Error("Authentication token is missing");
      }

      setLoading(true);
      setError(null);

      console.log("Fetching customers in Customers component");

      const data = await secureFetch("/customers");

      if (!data || typeof data !== "object") {
        throw new Error("Invalid response from server");
      }

      if (data.success) {
        // console.log('Customers fetched successfully', data.customers);
        const customersData = Array.isArray(data.customers)
          ? data.customers
          : [];
        const validatedCustomers = customersData.map((customer) => ({
          id: customer.entry_id || Math.random().toString(),
          name: customer.customer_name || "N/A",
          number: customer.contact_number1 || "N/A",
          city: customer.address || "N/A",
          // Store the original value but also provide a computed boolean
          isVisited: customer.isVisited || customer.visited || 0,
          // Include all original data for detailed view
          ...customer,
        }));

        setCustomers(validatedCustomers);
        console.log(
          `Fetched ${validatedCustomers.length} customers in Customers component`
        );
      } else {
        throw new Error(data.message || "Failed to fetch customers");
      }
    } catch (error) {
      console.error("Error fetching customers in Customers component:", error);

      let errorMessage = "Network error. Please try again.";
      if (error.message.includes("timeout")) {
        errorMessage = "Request timeout. Please check your connection.";
      } else if (error.message.includes("Authentication")) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (error.message.includes("HTTP error")) {
        errorMessage = "Server error. Please try again later.";
      }

      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if data was passed from CusList component
    if (route.params?.customers && route.params?.preloaded) {
      console.log("Using preloaded customers data");
      const preloadedCustomers = route.params.customers.map((customer) => ({
        id: customer.entry_id || Math.random().toString(),
        name: customer.customer_name || "N/A",
        number: customer.contact_number1 || "N/A",
        city: customer.address || "N/A",
        isVisited: customer.isVisited || customer.visited || 0,
        ...customer,
      }));
      setCustomers(preloadedCustomers);
      setLoading(false);
    } else {
      // Fetch data independently if component opened directly
      console.log("Fetching customers independently");
      fetchCustomers();
    }
  }, [route.params]);

  // const handlePress = (person) => {
  //   setSelectedPerson(person);
  //   setModalVisible(true);
  // };

  const handlePress = (person) => {
    console.log("Person data passed to DetailedCust:", person);
    setSelectedPerson(person);
    setModalVisible(true);
  };

  const handleRefresh = () => {
    fetchCustomers();
  };

  const handleCall = (phoneNumber) => {
    if (phoneNumber && phoneNumber !== "N/A") {
      const phoneUrl = `tel:${phoneNumber}`;
      Linking.openURL(phoneUrl).catch((err) => {
        Alert.alert("Error", "Could not make phone call");
        console.error("Error opening phone app:", err);
      });
    } else {
      Alert.alert("Error", "Phone number not available");
    }
  };

  // Filter customers based on search query
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.number.includes(searchQuery) ||
      customer.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={tw`flex-1 bg-white justify-center items-center`}>
        <ActivityIndicator size="large" color="#7cc0d8" />
        <Text style={tw`text-gray-600 text-xs mt-2`}>Loading customers...</Text>
      </View>
    );
  }

  if (error && customers.length === 0) {
    return (
      <View style={tw`flex-1 bg-white justify-center items-center p-4`}>
        <Text style={tw`text-gray-600 text-xs text-center mb-4`}>{error}</Text>
        <TouchableOpacity
          onPress={fetchCustomers}
          style={[tw`px-3 py-1 rounded-lg`, { backgroundColor: "#7cc0d8" }]}
        >
          <Text style={tw`text-white font-semibold text-xs`}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={tw`flex-1 bg-white`}
      showsVerticalScrollIndicator={false}
    >
      <View style={tw`p-3`}>
        <View style={tw`flex-row justify-between items-center mb-3`}>
          <Text style={tw`text-lg font-bold`}>
            Customer List{" "}
            {route.params?.agentName ? `- ${route.params.agentName}` : ""}
          </Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={[tw`font-semibold text-xs`, { color: "#7cc0d8" }]}>
              🔄 Refresh
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={tw`text-gray-600 text-xs mb-3`}>
          Total: {customers.length} customers
          {route.params?.preloaded && " (Preloaded)"}
        </Text>

        {/* Search Bar */}
        <View
          style={tw`flex-row items-center bg-gray-100 rounded-full px-3 py-2 mb-3`}
        >
          <Ionicons name="search" size={16} color="gray" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, number, or city..."
            style={tw`ml-2 flex-1 text-sm`}
            placeholderTextColor="gray"
          />
        </View>

        {/* Customer Cards */}
        {filteredCustomers.length === 0 ? (
          <View style={tw`items-center p-6`}>
            <Text style={tw`text-gray-600 text-xs text-center`}>
              {searchQuery
                ? "No customers found matching your search"
                : "No customers available"}
            </Text>
          </View>
        ) : (
          filteredCustomers.map((person) => {
            const isVisited = isCustomerVisited(person);

            return (
              <TouchableOpacity
                onPress={() => handlePress(person)}
                key={person.id}
                style={[
                  tw`p-3 rounded-lg mb-2 border`,
                  isVisited
                    ? {
                        backgroundColor: "#f0f9f0",
                        borderLeftColor: "#10b981",
                        borderLeftWidth: 7,
                      }
                    : {
                        backgroundColor: "#fef2f2",
                        borderLeftColor: "#ef4444",
                        borderLeftWidth: 7,
                      },
                ]}
              >
                <View style={tw`flex-row justify-between items-start`}>
                  <View style={tw`flex-1 mr-2`}>
                    <Text style={tw`text-sm font-bold text-gray-800`}>
                      {person.name}
                    </Text>
                    <View style={tw`flex-row items-center mt-1`}>
                      <TouchableOpacity
                        onPress={() => handleCall(person.number)}
                        style={tw`flex-row items-center`}
                      >
                        <Ionicons name="call" size={12} color="#3b82f6" />
                        <Text style={tw`text-xs text-blue-500 ml-1`}>
                          {person.number}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={tw`flex-row items-center mt-1`}>
                      <Ionicons name="location" size={10} color="#6b7280" />
                      <Text style={tw`text-xs text-gray-500 ml-1`}>
                        {person.address}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      tw`px-2 py-1 rounded-full`,
                      isVisited
                        ? { backgroundColor: "#d1fae5" }
                        : { backgroundColor: "#fee2e2" },
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-xs font-semibold`,
                        isVisited ? { color: "#065f46" } : { color: "#991b1b" },
                      ]}
                    >
                      {isVisited ? "Visited" : "Pending"}
                    </Text>
                  </View>
                </View>

                {/* {isVisited && (
                  <View style={tw`flex-row items-center mt-2 pt-1 border-t border-gray-200`}>
                    <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                    <Text style={tw`text-xs text-green-700 ml-1`}>
                      Already visited
                    </Text>
                  </View>
                )} */}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Detailed Customer Modal */}
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

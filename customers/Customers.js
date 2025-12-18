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
  RefreshControl,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import DetailedCust from "./DetailedCust";

const Customers = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Get navigation parameters to determine which tab to show initially
  // const { showPendingOnly, showVisitedOnly, agentName } = route.params || {};

  // const [activeTab, setActiveTab] = useState(
  //   showPendingOnly ? "pending" : showVisitedOnly ? "visited" : "pending"
  // );

  const {
    initialTab = "pending",
    agentName,
    showPendingOnly,
    showVisitedOnly,
  } = route.params || {};

  const [activeTab, setActiveTab] = useState(
    showPendingOnly ? "pending" : showVisitedOnly ? "visited" : initialTab
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      const newActiveTab = showPendingOnly
        ? "pending"
        : showVisitedOnly
          ? "visited"
          : initialTab;
      setActiveTab(newActiveTab);
    });

    return unsubscribe;
  }, [navigation, initialTab, showPendingOnly, showVisitedOnly]);

  useEffect(() => {
    const newActiveTab = showPendingOnly
      ? "pending"
      : showVisitedOnly
        ? "visited"
        : initialTab;
    setActiveTab(newActiveTab);
  }, [initialTab, showPendingOnly, showVisitedOnly]);


  const SERVER_IP = "192.168.65.11";
  const BASE_URL = `http://${SERVER_IP}:3000/api`;
  const REQUEST_TIMEOUT = 10000;

  const isCustomerVisited = (customer) => {
    const isVisited = customer.isVisited;
    const visited = customer.visited;

    if (
      isVisited === 1 ||
      isVisited === true ||
      isVisited === "1" ||
      isVisited === "true"
    ) {
      return true;
    }

    if (
      visited === 1 ||
      visited === true ||
      visited === "1" ||
      visited === "true"
    ) {
      return true;
    }

    return false;
  };

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

  const updateCustomerVisitedStatus = (customerId) => {
    setCustomers((prevCustomers) =>
      prevCustomers.map((customer) =>
        customer.customer_id === customerId || customer.entry_id === customerId
          ? { ...customer, isVisited: 1, visited: 1 }
          : customer
      )
    );
  };

  const fetchCustomers = useCallback(
    async (showLoader = true, forceRefresh = false) => {
      // Don't fetch if we already have data and it's not a force refresh
      if (dataLoaded && !forceRefresh && customers.length > 0) {
        console.log("Using cached customers data");
        if (showLoader) {
          setLoading(false);
        }
        return;
      }

      try {
        if (!token) {
          throw new Error("Authentication token is missing");
        }

        if (showLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        setError(null);

        console.log("Fetching customers in Customers component");

        const data = await secureFetch("/customers");

        if (!data || typeof data !== "object") {
          throw new Error("Invalid response from server");
        }

        if (data.success) {
          const customersData = Array.isArray(data.customers)
            ? data.customers
            : [];

          const validatedCustomers = customersData.map((customer) => ({
            id: customer.entry_id || Math.random().toString(),
            name: customer.customer_name || "N/A",
            number: customer.contact_number1 || "N/A",
            city: customer.address || "N/A",
            isVisited: customer.isVisited || 0,
            visited: customer.visited || 0,
            // Include all original data for detailed view
            ...customer,
          }));

          setCustomers(validatedCustomers);
          setDataLoaded(true);

          // Analytics
          const totalFromServer = customersData.length;
          const visitedCount = customersData.filter(isCustomerVisited).length;
          const nonVisitedCount = totalFromServer - visitedCount;
        } else {
          throw new Error(data.message || "Failed to fetch customers");
        }
      } catch (error) {
        console.error(
          "Error fetching customers in Customers component:",
          error
        );

        let errorMessage = "Network error. Please try again.";
        if (error.message.includes("timeout")) {
          errorMessage = "Request timeout. Please check your connection.";
        } else if (error.message.includes("Authentication")) {
          errorMessage = "Authentication failed. Please login again.";
        } else if (error.message.includes("HTTP error")) {
          errorMessage = "Server error. Please try again later.";
        }

        setError(errorMessage);
        if (showLoader) {
          Alert.alert("Error", errorMessage);
        }
      } finally {
        if (showLoader) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [token, dataLoaded, customers.length]
  );

  // Manual refresh function
  const handleRefresh = useCallback(() => {
    console.log("Manual refresh triggered");
    fetchCustomers(false, true); // Force refresh
  }, [fetchCustomers]);

  useEffect(() => {
    // Check if data was passed from CusList component
    if (route.params?.customers && route.params?.preloaded) {
      console.log("Using preloaded customers data from CusList");

      const preloadedCustomers = route.params.customers.map((customer) => ({
        id: customer.entry_id || Math.random().toString(),
        name: customer.customer_name || "N/A",
        number: customer.contact_number1 || "N/A",
        city: customer.address || "N/A",
        isVisited: customer.isVisited || 0,
        visited: customer.visited || 0,
        ...customer,
      }));

      setCustomers(preloadedCustomers);
      setDataLoaded(true);
      setLoading(false);

      console.log(`📊 PRELOAD DATA: ${preloadedCustomers.length} customers`);
    } else if (!dataLoaded) {
      // Fetch data independently if component opened directly and no data is loaded
      console.log("Fetching customers independently");
      fetchCustomers();
    }
  }, [route.params, dataLoaded, fetchCustomers]);

  const handlePress = (person) => {
    setSelectedPerson(person);
    setModalVisible(true);
  };

  // Handle response saved callback from DetailedCust
  const handleResponseSaved = (customerId) => {
    console.log("✅ Response saved for customer:", customerId);

    // Update the customer's visited status immediately
    updateCustomerVisitedStatus(customerId);

    // Close the modal
    setModalVisible(false);

    // Show success message
    Alert.alert(
      "Success",
      "Response saved successfully! Customer marked as visited.",
      [{ text: "OK" }]
    );
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

  // Separate non-visited and visited customers
  const nonVisitedCustomers = filteredCustomers.filter(
    (customer) => !isCustomerVisited(customer)
  );
  const visitedCustomers = filteredCustomers.filter(isCustomerVisited);

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
          onPress={() => fetchCustomers(true, true)}
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={["#7cc0d8"]}
          tintColor="#7cc0d8"
        />
      }
    >
      <View style={tw`p-3`}>
        <View style={tw`flex-row justify-between items-center mb-3`}>
          <Text style={tw`text-lg font-bold`}>
            Customer List{" "}
            {agentName
              ? `- ${agentName}`
              : user?.username
                ? `- ${user.username}`
                : ""}
          </Text>
          <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color="#7cc0d8" />
            ) : (
              <Text style={[tw`font-semibold text-xs`, { color: "#7cc0d8" }]}>
                🔄 Refresh
              </Text>
            )}
          </TouchableOpacity>
        </View>

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
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="gray" />
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation Tabs */}
        <View style={tw`flex-row mb-4 bg-gray-100 rounded-lg p-1`}>
          <TouchableOpacity
            style={[
              tw`flex-1 py-2 rounded-md items-center`,
              activeTab === "pending" && { backgroundColor: "#fee2e2" },
            ]}
            onPress={() => setActiveTab("pending")}
          >
            <Text
              style={[
                tw`text-xs font-semibold`,
                activeTab === "pending"
                  ? { color: "#991b1b" }
                  : { color: "#6b7280" },
              ]}
            >
              Pending ({nonVisitedCustomers.length}/{customers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              tw`flex-1 py-2 rounded-md items-center`,
              activeTab === "visited" && { backgroundColor: "#d1fae5" },
            ]}
            onPress={() => setActiveTab("visited")}
          >
            <Text
              style={[
                tw`text-xs font-semibold`,
                activeTab === "visited"
                  ? { color: "#065f46" }
                  : { color: "#6b7280" },
              ]}
            >
              Visited ({visitedCustomers.length}/{customers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pending Customers Section - Only shown when pending tab is active */}
        {activeTab === "pending" && nonVisitedCustomers.length > 0 && (
          <View style={tw`mb-6`}>
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <Text style={tw`text-base font-bold text-red-600`}>
                Pending Customers ({nonVisitedCustomers.length}) / (
                {customers.length})
              </Text>
              <View
                style={[
                  tw`px-2 py-1 rounded-full`,
                  { backgroundColor: "#fee2e2" },
                ]}
              >
                <Text style={[tw`text-xs font-semibold`, { color: "#991b1b" }]}>
                  Action Required
                </Text>
              </View>
            </View>

            {nonVisitedCustomers.map((person) => (
              <TouchableOpacity
                onPress={() => handlePress(person)}
                key={person.id}
                style={[
                  tw`p-3 rounded-lg mb-2 border`,
                  {
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
                      { backgroundColor: "#fee2e2" },
                    ]}
                  >
                    <Text
                      style={[tw`text-xs font-semibold`, { color: "#991b1b" }]}
                    >
                      Pending
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Visited Customers Section - Only shown when visited tab is active */}
        {activeTab === "visited" && visitedCustomers.length > 0 && (
          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <Text style={tw`text-base font-bold text-green-600`}>
                Completed Visits ({visitedCustomers.length}) / (
                {customers.length})
              </Text>
              <View
                style={[
                  tw`px-2 py-1 rounded-full`,
                  { backgroundColor: "#d1fae5" },
                ]}
              >
                <Text style={[tw`text-xs font-semibold`, { color: "#065f46" }]}>
                  Completed
                </Text>
              </View>
            </View>

            {visitedCustomers.map((person) => (
              <TouchableOpacity
                onPress={() => handlePress(person)}
                key={person.id}
                style={[
                  tw`p-3 rounded-lg mb-2 border`,
                  {
                    backgroundColor: "#f0f9f0",
                    borderLeftColor: "#10b981",
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
                      { backgroundColor: "#d1fae5" },
                    ]}
                  >
                    <Text
                      style={[tw`text-xs font-semibold`, { color: "#065f46" }]}
                    >
                      Visited
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No Results Message */}
        {((activeTab === "pending" && nonVisitedCustomers.length === 0) ||
          (activeTab === "visited" && visitedCustomers.length === 0)) && (
          <View style={tw`items-center p-6`}>
            <Ionicons
              name={
                activeTab === "pending"
                  ? "time-outline"
                  : "checkmark-circle-outline"
              }
              size={32}
              color="#9ca3af"
            />
            <Text style={tw`text-gray-600 text-xs mt-2 text-center`}>
              {searchQuery
                ? `No ${activeTab} customers found matching your search`
                : `No ${activeTab} customers available`}
            </Text>
            {searchQuery && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={[
                  tw`px-3 py-1 rounded-lg mt-2`,
                  { backgroundColor: "#7cc0d8" },
                ]}
              >
                <Text style={tw`text-white font-semibold text-xs`}>
                  Clear Search
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
          onResponseSaved={handleResponseSaved}
        />
      </Modal>
    </ScrollView>
  );
};

export default Customers;
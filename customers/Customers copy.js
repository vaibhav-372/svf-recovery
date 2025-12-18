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
import React, { useState, useEffect, useCallback, useRef } from "react";
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
  
  // Use refs to track component mount state
  const isMounted = useRef(true);
  const modalTimeoutRef = useRef(null);

  const {
    initialTab = "pending",
    agentName,
    showPendingOnly,
    showVisitedOnly,
  } = route.params || {};

  const [activeTab, setActiveTab] = useState(
    showPendingOnly ? "pending" : showVisitedOnly ? "visited" : initialTab
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
      }
    };
  }, []);

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

  const isCustomerVisited = useCallback((customer) => {
    if (!customer) return false;
    const isVisited = customer?.isVisited;
    return isVisited === 1 || isVisited === true || isVisited === "1" || isVisited === "true";
  }, []);

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

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Request timeout. Please check your connection.");
      }
      throw error;
    }
  };

  const updateCustomerVisitedStatus = useCallback((customerId) => {
    if (!isMounted.current) return;
    
    setCustomers((prevCustomers) =>
      prevCustomers.map((customer) =>
        (customer?.customer_id === customerId || customer?.entry_id === customerId)
          ? { ...customer, isVisited: 1 }
          : customer
      )
    );
  }, []);

  const fetchCustomers = useCallback(
    async (showLoader = true, forceRefresh = false) => {
      // Prevent execution if component is unmounted
      if (!isMounted.current) return;

      // Don't fetch if we already have data and it's not a force refresh
      if (dataLoaded && !forceRefresh && customers.length > 0) {
        if (showLoader && isMounted.current) {
          setLoading(false);
        }
        return;
      }

      try {
        if (!token) {
          throw new Error("Authentication token is missing");
        }

        if (showLoader && isMounted.current) {
          setLoading(true);
        } else if (isMounted.current) {
          setRefreshing(true);
        }
        
        if (isMounted.current) {
          setError(null);
        }

        const data = await secureFetch("/customers");

        if (!data || typeof data !== "object") {
          throw new Error("Invalid response from server");
        }

        if (data.success) {
          const customersData = Array.isArray(data?.customers)
            ? data.customers
            : [];

          const validatedCustomers = customersData.map((customer) => ({
            id: customer?.entry_id || `cust_${Math.random().toString(36).substr(2, 9)}`,
            name: customer?.customer_name || "N/A",
            number: customer?.contact_number1 || "N/A",
            address: customer?.address || "N/A",
            isVisited: customer?.isVisited || 0,
            ...customer,
          }));

          if (isMounted.current) {
            setCustomers(validatedCustomers);
            setDataLoaded(true);
          }
        } else {
          throw new Error(data.message || "Failed to fetch customers");
        }
      } catch (error) {
        console.error("Error fetching customers:", error);

        let errorMessage = "Network error. Please try again.";
        if (error.message.includes("timeout")) {
          errorMessage = "Request timeout. Please check your connection.";
        } else if (error.message.includes("Authentication")) {
          errorMessage = "Authentication failed. Please login again.";
        } else if (error.message.includes("HTTP error")) {
          errorMessage = "Server error. Please try again later.";
        }

        if (isMounted.current) {
          setError(errorMessage);
          if (showLoader) {
            Alert.alert("Error", errorMessage);
          }
        }
      } finally {
        if (isMounted.current) {
          if (showLoader) {
            setLoading(false);
          } else {
            setRefreshing(false);
          }
        }
      }
    },
    [token, dataLoaded]
  );

  // Manual refresh function
  const handleRefresh = useCallback(() => {
    fetchCustomers(false, true);
  }, [fetchCustomers]);

  useEffect(() => {
    // Check if data was passed from CusList component
    if (route.params?.customers && route.params?.preloaded && isMounted.current) {
      const preloadedCustomers = route.params.customers.map((customer) => ({
        id: customer?.entry_id || `cust_${Math.random().toString(36).substr(2, 9)}`,
        name: customer?.customer_name || "N/A",
        number: customer?.contact_number1 || "N/A",
        address: customer?.address || "N/A",
        isVisited: customer?.isVisited || 0,
        ...customer,
      }));

      setCustomers(preloadedCustomers);
      setDataLoaded(true);
      setLoading(false);
    } else if (!dataLoaded && isMounted.current) {
      fetchCustomers();
    }
  }, [route.params, dataLoaded, fetchCustomers]);

  const handlePress = useCallback((person) => {
    if (!person || !isMounted.current) return;
    
    // Close any existing modal first
    setModalVisible(false);
    
    // Small delay to ensure modal is fully closed
    modalTimeoutRef.current = setTimeout(() => {
      if (isMounted.current) {
        setSelectedPerson(person);
        setModalVisible(true);
      }
    }, 100);
  }, []);

  // Handle response saved callback from DetailedCust
  const handleResponseSaved = useCallback((customerId) => {
    if (!isMounted.current) return;
    
    // Update the customer's visited status immediately
    updateCustomerVisitedStatus(customerId);

    // Close the modal with animation
    setModalVisible(false);
    
    // Small delay before showing alert
    modalTimeoutRef.current = setTimeout(() => {
      if (isMounted.current) {
        Alert.alert(
          "Success",
          "Response saved successfully! Customer marked as visited.",
          [{ text: "OK" }]
        );
      }
    }, 300);
  }, [updateCustomerVisitedStatus]);

  const handleCall = useCallback((phoneNumber) => {
    if (phoneNumber && phoneNumber !== "N/A") {
      const phoneUrl = `tel:${phoneNumber}`;
      Linking.openURL(phoneUrl).catch((err) => {
        Alert.alert("Error", "Could not make phone call");
        console.error("Error opening phone app:", err);
      });
    } else {
      Alert.alert("Error", "Phone number not available");
    }
  }, []);

  // Memoized filtered customers to prevent unnecessary re-renders
  const filteredCustomers = React.useMemo(() => {
    if (!customers.length) return [];
    
    return customers.filter((customer) => {
      if (!customer) return false;
      
      const name = String(customer?.name || "").toLowerCase();
      const number = String(customer?.number || "");
      const address = String(customer?.address || "").toLowerCase();
      const query = String(searchQuery || "").toLowerCase();
      
      return name.includes(query) || 
             number.includes(query) || 
             address.includes(query);
    });
  }, [customers, searchQuery]);

  // Memoized customer lists
  const nonVisitedCustomers = React.useMemo(() => 
    filteredCustomers.filter((customer) => !isCustomerVisited(customer)),
    [filteredCustomers, isCustomerVisited]
  );

  const visitedCustomers = React.useMemo(() => 
    filteredCustomers.filter(isCustomerVisited),
    [filteredCustomers, isCustomerVisited]
  );

  // Close modal handler
  const handleCloseModal = useCallback(() => {
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current);
    }
    setModalVisible(false);
  }, []);

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
    <>
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

          {/* Customer Lists */}
          <CustomerListSection
            activeTab={activeTab}
            customers={activeTab === "pending" ? nonVisitedCustomers : visitedCustomers}
            handlePress={handlePress}
            handleCall={handleCall}
            type={activeTab}
            totalCustomers={customers.length}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </View>
      </ScrollView>

      {/* Detailed Customer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        {selectedPerson && (
          <DetailedCust
            person={selectedPerson}
            onClose={handleCloseModal}
            onResponseSaved={handleResponseSaved}
          />
        )}
      </Modal>
    </>
  );
};

// Separate component for customer list to reduce main component re-renders
const CustomerListSection = React.memo(({
  activeTab,
  customers,
  handlePress,
  handleCall,
  type,
  totalCustomers,
  searchQuery,
  setSearchQuery,
}) => {
  if (customers.length === 0) {
    return (
      <View style={tw`items-center p-6`}>
        <Ionicons
          name={
            type === "pending"
              ? "time-outline"
              : "checkmark-circle-outline"
          }
          size={32}
          color="#9ca3af"
        />
        <Text style={tw`text-gray-600 text-xs mt-2 text-center`}>
          {searchQuery
            ? `No ${type} customers found matching your search`
            : `No ${type} customers available`}
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
    );
  }

  return (
    <View style={tw`mb-6`}>
      <View style={tw`flex-row items-center justify-between mb-3`}>
        <Text style={tw`text-base font-bold ${type === "pending" ? "text-red-600" : "text-green-600"}`}>
          {type === "pending" ? "Pending" : "Completed"} Customers ({customers.length}/{totalCustomers})
        </Text>
        <View
          style={[
            tw`px-2 py-1 rounded-full`,
            { backgroundColor: type === "pending" ? "#fee2e2" : "#d1fae5" },
          ]}
        >
          <Text style={[tw`text-xs font-semibold`, { color: type === "pending" ? "#991b1b" : "#065f46" }]}>
            {type === "pending" ? "Action Required" : "Completed"}
          </Text>
        </View>
      </View>

      {customers.map((person) => (
        <TouchableOpacity
          onPress={() => handlePress(person)}
          key={person.id}
          style={[
            tw`p-3 rounded-lg mb-2 border`,
            {
              backgroundColor: type === "pending" ? "#fef2f2" : "#f0f9f0",
              borderLeftColor: type === "pending" ? "#ef4444" : "#10b981",
              borderLeftWidth: 7,
            },
          ]}
        >
          <View style={tw`flex-row justify-between items-start`}>
            <View style={tw`flex-1 mr-2`}>
              <Text style={tw`text-sm font-bold text-gray-800`}>
                {person.name || "N/A"}
              </Text>
              <View style={tw`flex-row items-center mt-1`}>
                <TouchableOpacity
                  onPress={() => handleCall(person.number)}
                  style={tw`flex-row items-center`}
                >
                  <Ionicons name="call" size={12} color="#3b82f6" />
                  <Text style={tw`text-xs text-blue-500 ml-1`}>
                    {person.number || "N/A"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={tw`flex-row items-center mt-1`}>
                <Ionicons name="location" size={10} color="#6b7280" />
                <Text style={tw`text-xs text-gray-500 ml-1`}>
                  {person.address || "N/A"}
                </Text>
              </View>
            </View>
            <View
              style={[
                tw`px-2 py-1 rounded-full`,
                { backgroundColor: type === "pending" ? "#fee2e2" : "#d1fae5" },
              ]}
            >
              <Text
                style={[tw`text-xs font-semibold`, { color: type === "pending" ? "#991b1b" : "#065f46" }]}
              >
                {type === "pending" ? "Pending" : "Visited"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
});

CustomerListSection.displayName = 'CustomerListSection';

export default Customers;
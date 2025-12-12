import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "tailwind-react-native-classnames";
import DetailedHist from "./DetailedHist";
import { useState, useEffect } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../context/AuthContext";

const History = () => {
  const { token } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("today");

  const SERVER_IP = "192.168.65.11";
  const BASE_URL = `http://${SERVER_IP}:3000`;

  const fetchHistoryData = async () => {
    try {
      setError(null);
      setLoading(true);

      let url = "";
      let params = {};

      if (viewMode === "today") {
        url = "/api/history/today";
      } else {
        url = "/api/history";
        params = {
          fromDate: fromDate.toISOString().split("T")[0],
          toDate: toDate.toISOString().split("T")[0],
        };
      }

      const queryString = new URLSearchParams(params).toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;

      const response = await fetch(`${BASE_URL}${fullUrl}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("Raw API response:", result.data[0]); // Debug log

        // Group by customer_id to show only one card per customer
        const customerMap = new Map();

        result.data.forEach((item) => {
          if (!customerMap.has(item.customer_id)) {
            customerMap.set(item.customer_id, {
              customer_id: item.customer_id,
              name: item.name || item.customer_name,
              number: item.number || item.contact_number1,
              address: item.address,
              city: item.city,
              // Store all responses for this customer
              allResponses: [item],
              // Use the latest visited_time
              visited_time: item.visited_time,
              uniqueKey: `customer_${item.customer_id}_${Date.now()}`,
            });
          } else {
            // Add this response to existing customer
            const existingCustomer = customerMap.get(item.customer_id);
            existingCustomer.allResponses.push(item);
            // Update to latest visited_time
            if (
              new Date(item.visited_time) >
              new Date(existingCustomer.visited_time)
            ) {
              existingCustomer.visited_time = item.visited_time;
            }
          }
        });

        // Convert map back to array - now we have one entry per customer
        const processedData = Array.from(customerMap.values());

        console
          .log
          // `Grouped ${result.data.length} records into ${processedData.length} customers`
          ();
        console.log("Processed customer data:", processedData[0]);
        setFilteredData(processedData);
      } else {
        setError(result.message || "Failed to fetch history data");
      }
    } catch (err) {
      console.error("Error fetching history data:", err);
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchHistoryData();
    }
  }, [fromDate, toDate, viewMode, token]);

  const handlePress = (person) => {
    setSelectedPerson(person);
    setModalVisible(true);
  };

  const onFromDateChange = (event, selectedDate) => {
    setShowFromDatePicker(false);
    if (selectedDate) {
      setFromDate(selectedDate);
    }
  };

  const onToDateChange = (event, selectedDate) => {
    setShowToDatePicker(false);
    if (selectedDate) {
      setToDate(selectedDate);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistoryData();
  };

  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timeString;
    }
  };

  if (!token) {
    return (
      <View style={tw`flex-1 bg-white justify-center items-center`}>
        <ActivityIndicator size="large" color="#7cc0d8" />
        <Text style={tw`mt-4 text-gray-600`}>Authenticating...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={tw`flex-1 bg-white justify-center items-center`}>
        <ActivityIndicator size="large" color="#7cc0d8" />
        <Text style={tw`mt-4 text-gray-600`}>Loading history...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={tw`flex-1 bg-white`}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#7cc0d8"]}
        />
      }
    >
      <View style={tw`p-4`}>
        <Text style={tw`text-xl font-bold mb-4`}>Completed Visits History</Text>

        {/* View Mode Toggle */}
        <View style={tw`flex-row mb-4`}>
          <TouchableOpacity
            style={[
              tw`flex-1 py-2 rounded-l-lg border`,
              viewMode === "today"
                ? tw`bg-blue-500 border-blue-500`
                : tw`bg-gray-200 border-gray-300`,
            ]}
            onPress={() => setViewMode("today")}
          >
            <Text
              style={[
                tw`text-center font-semibold`,
                viewMode === "today" ? tw`text-white` : tw`text-gray-700`,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              tw`flex-1 py-2 rounded-r-lg border`,
              viewMode === "range"
                ? tw`bg-blue-500 border-blue-500`
                : tw`bg-gray-200 border-gray-300`,
            ]}
            onPress={() => setViewMode("range")}
          >
            <Text
              style={[
                tw`text-center font-semibold`,
                viewMode === "range" ? tw`text-white` : tw`text-gray-700`,
              ]}
            >
              Date Range
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Range Filter (only show when in range mode) */}
        {viewMode === "range" && (
          <View style={tw`flex-row justify-between mb-4`}>
            <View style={tw`flex-1 mr-2`}>
              <Text style={tw`text-sm font-semibold mb-1`}>From Date</Text>
              <TouchableOpacity
                style={tw`border border-gray-300 rounded-lg p-2`}
                onPress={() => setShowFromDatePicker(true)}
              >
                <Text style={tw`text-center`}>{formatDate(fromDate)}</Text>
              </TouchableOpacity>
            </View>

            <View style={tw`flex-1 ml-2`}>
              <Text style={tw`text-sm font-semibold mb-1`}>To Date</Text>
              <TouchableOpacity
                style={tw`border border-gray-300 rounded-lg p-2`}
                onPress={() => setShowToDatePicker(true)}
              >
                <Text style={tw`text-center`}>{formatDate(toDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Date Pickers */}
        {showFromDatePicker && (
          <DateTimePicker
            value={fromDate}
            mode="date"
            display="default"
            onChange={onFromDateChange}
          />
        )}

        {showToDatePicker && (
          <DateTimePicker
            value={toDate}
            mode="date"
            display="default"
            onChange={onToDateChange}
          />
        )}

        {/* Error Message */}
        {error && (
          <View style={tw`bg-red-100 p-3 rounded-lg mb-4`}>
            <Text style={tw`text-red-700 text-center`}>{error}</Text>
            <TouchableOpacity
              style={tw`mt-2 bg-red-600 py-2 rounded-lg`}
              onPress={fetchHistoryData}
            >
              <Text style={tw`text-white text-center font-semibold`}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {filteredData.length === 0 ? (
          <View style={tw`items-center mt-8`}>
            <Text style={tw`text-center text-gray-500 text-lg`}>
              {error ? "Failed to load data" : "No completed visits found."}
            </Text>
            <TouchableOpacity
              style={tw`mt-4 bg-blue-500 px-6 py-2 rounded-lg`}
              onPress={fetchHistoryData}
            >
              <Text style={tw`text-white font-semibold`}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredData.map((person, index) => {
            const itemKey =
              person.uniqueKey || `history_item_${person.customer_id}_${index}`;

            return (
              <TouchableOpacity
                key={itemKey}
                onPress={() => handlePress(person)}
              >
                <View
                  style={[
                    tw`bg-white p-4 mb-3 rounded-lg shadow flex flex-row justify-between`,
                    {
                      borderLeftWidth: 5,
                      borderLeftColor: "#7cc0d8",
                      elevation: 5,
                    },
                  ]}
                >
                  {/* Left Section */}
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-lg font-bold`}>
                      {person.name ||
                        person.customer_name ||
                        "Unknown Customer"}
                    </Text>
                    <Text style={tw`text-sm text-gray-700 mt-1`}>
                      {person.number || person.contact_number1 || "No Number"}
                    </Text>
                    <Text style={tw`text-xs text-gray-500 mt-1`}>
                      {person.allResponses?.length || 0} PT number(s)
                    </Text>
                  </View>

                  {/* Right Section */}
                  <View style={tw`flex-1 items-end`}>
                    <Text style={tw`text-sm text-gray-700 text-right`}>
                      {person.address ? person.address : "Completed"}
                    </Text>
                    <Text style={tw`text-sm text-gray-700 mt-3 font-bold`}>
                      {formatTime(person.visited_time)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

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

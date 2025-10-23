import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  Switch,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import tw from "tailwind-react-native-classnames";
import Entypo from "@expo/vector-icons/Entypo";
import CustRelated from "./CustRelated";
import CameraComponent from "./CameraComponent";
import MapWebView from "./MapWebView";
import ImageViewing from "react-native-image-viewing";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

const { height } = Dimensions.get("window");

const DetailedCust = ({ person, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(height)).current;
  const [isVisited, setIsVisited] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageViewVisible, setImageViewVisible] = useState(false);
  const [customerResponse, setCustomerResponse] = useState("");
  const [selectedResponse, setSelectedResponse] = useState("");
  const [loadingRelated, setLoadingRelated] = useState(false);

  const { token } = useAuth();
  const SERVER_IP = "192.168.65.11";
  const BASE_URL = `http://${SERVER_IP}:3000/api`;

  useEffect(() => {
    if (person) {
      setIsVisited(person.isVisited === 1 || person.visited === 1);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [person]);

  const handleToggle = () => {
    Alert.alert(
      "Confirm",
      isVisited ? "Mark as not visited?" : "Mark as visited?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: () => setIsVisited((prev) => !prev),
        },
      ]
    );
  };

  const handleCapture = (data) => {
    console.log("Captured Data: ", data);
    setCapturedImage(data);
    setCameraVisible(false);
  };

  // In DetailedCust.js, update the fetchAllCustomerPTs function:

  const fetchAllCustomerPTs = async (customerId) => {
    try {
      setLoadingRelated(true);

      // First try by customer ID
      let response = await fetch(`${BASE_URL}/customers/${customerId}/loans`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // If 404, try by customer name as fallback
      if (response.status === 404) {
        console.log("Customer ID endpoint not found, trying by name...");
        const customerName = person.customer_name || person.name;
        response = await fetch(
          `${BASE_URL}/customers/${encodeURIComponent(customerName)}/loans-by-name`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log(`Fetched ${data.loans.length} PT records for customer`);
        return data.loans;
      } else {
        throw new Error(data.message || "Failed to fetch customer loans");
      }
    } catch (error) {
      console.error("Error fetching customer PTs:", error);

      // Don't show alert for 404 - it's expected if endpoint doesn't exist
      if (!error.message.includes("404")) {
        Alert.alert("Error", "Failed to load customer loan details");
      }

      return [];
    } finally {
      setLoadingRelated(false);
    }
  };

  // Handle list icon click - fetch data and open modal
  const handleViewDetails = async () => {
    if (loadingRelated) return;

    try {
      // Get customer ID from person object
      const customerId = person.customer_id || person.entry_id;

      if (!customerId) {
        Alert.alert("Error", "Customer ID not found");
        return;
      }

      console.log("Fetching all PTs for customer:", customerId);

      // Start loading and fetch data
      setLoadingRelated(true);
      const allPTs = await fetchAllCustomerPTs(customerId);

      // Prepare data for CustRelated
      const customerData = {
        customerInfo: person,
        allPTs: allPTs.length > 0 ? allPTs : [person], // Use fetched data or fallback to current person
      };

      setSelectedPerson(customerData);
      setModalVisible(true);
    } catch (error) {
      console.error("Error in handleViewDetails:", error);
      // Fallback: show current customer data
      setSelectedPerson({
        customerInfo: person,
        allPTs: [person],
      });
      setModalVisible(true);
    }
  };

  if (!person) return null;

  return (
    <Animated.View
      style={[
        tw`absolute top-0 left-0 right-0 bottom-0`,
        {
          backgroundColor: "rgba(0,0,0,0.5)",
          opacity: fadeAnim,
          transform: [{ translateY: translateYAnim }],
          justifyContent: "center",
          alignItems: "center",
        },
      ]}
    >
      <View
        style={[
          tw`bg-white rounded-t-3xl w-full h-full px-4 pb-5`,
          { paddingTop: 40 },
        ]}
      >
        {/* Header with Icons */}
        <View style={tw`flex flex-row justify-between items-center mb-4`}>
          <TouchableOpacity
            onPress={handleViewDetails}
            style={tw`flex-row items-center`}
            disabled={loadingRelated}
          >
            {loadingRelated ? (
              <ActivityIndicator size="small" color="#7cc0d8" />
            ) : (
              <Entypo name="list" size={24} color="#7cc0d8" />
            )}
            <Text
              style={[
                tw`ml-1 text-sm`,
                loadingRelated ? tw`text-gray-500` : tw`text-blue-500`,
              ]}
            >
              {loadingRelated ? "Loading..." : "View All Loans"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCameraVisible(true)}>
            <Entypo name="camera" size={24} color="#7cc0d8" />
          </TouchableOpacity>
        </View>

        {/* Customer Name */}
        <View>
          <Text
            style={[
              tw`text-center text-2xl font-bold mb-4`,
              { color: "#7cc0d8" },
            ]}
          >
            {person.customer_name || person.name}
          </Text>
          {/* <Text style={tw`text-center text-sm text-gray-600`}>
            PT: {person.pt_no || "N/A"}
          </Text> */}
        </View>

        <ScrollView style={tw`px-2`} showsVerticalScrollIndicator={false}>
          {/* Personal Information */}
          <View
            style={[
              tw`border-2 rounded-lg p-4 mb-4`,
              { borderColor: "#7cc0d8" },
            ]}
          >
            <Text
              style={[
                tw`text-lg font-semibold mb-3 text-center`,
                { color: "#7cc0d8" },
              ]}
            >
              Personal Information
            </Text>

            <InfoRow label="City" value={person.city || person.address} />
            <InfoRow label="Address" value={person.address} />
            <InfoRow
              label="Phone Number"
              value={person.contact_number1 || person.number}
            />
            <InfoRow label="Nominee Name" value={person.nominee_name} />
            <InfoRow
              label="Nominee Phone"
              value={person.nominee_contact_number}
            />
          </View>

          {/* Current Loan Information */}
          {/* <View
            style={[
              tw`border-2 rounded-lg p-4 mb-4`,
              { borderColor: "#7cc0d8" },
            ]}
          >
            <Text
              style={[
                tw`text-lg font-semibold mb-3 text-center`,
                { color: "#7cc0d8" },
              ]}
            >
              Current Loan Information
            </Text>

            <InfoRow label="Loan Amount" value={person.loan_amount} />
            <InfoRow label="Paid Amount" value={person.paid_amount} />
            <InfoRow label="Balance" value={calculateBalance(person)} />
            <InfoRow label="Interest Rate" value={person.interest_rate} />
            <InfoRow label="Tenure" value={person.tenure} />
            <InfoRow label="Last Date" value={person.last_date} />
          </View> */}

          {/* Customer Response */}
          <View
            style={[
              tw`border-2 rounded-lg p-4 mb-4`,
              { borderColor: "#7cc0d8" },
            ]}
          >
            <Text
              style={[
                tw`text-lg font-semibold mb-3 text-center`,
                { color: "#7cc0d8" },
              ]}
            >
              Customer Response
            </Text>

            <View style={tw`flex-row items-center mb-3`}>
              <View
                style={tw`flex-1 border border-gray-300 rounded-lg bg-white mr-2`}
              >
                <RNPickerSelect
                  onValueChange={(value) => setSelectedResponse(value)}
                  placeholder={{ label: "Select response...", value: "" }}
                  items={[
                    { label: "Call not lifting", value: "Call not lifting" },
                    {
                      label: "Customer not at home",
                      value: "Customer not at home",
                    },
                    { label: "Requested time", value: "Requested time" },
                    { label: "Others", value: "Others" },
                  ]}
                  style={{
                    inputAndroid: {
                      ...tw`text-sm text-gray-800 pl-3 pr-3 py-2`,
                    },
                    inputIOS: {
                      ...tw`text-sm text-gray-800 pl-3 pr-3 py-2`,
                    },
                    placeholder: {
                      color: "gray",
                    },
                  }}
                />
              </View>

              <TouchableOpacity
                onPress={() => {
                  console.log(
                    "Saved Response:",
                    selectedResponse,
                    customerResponse
                  );
                  Alert.alert("Saved", "Customer response saved successfully");
                  setSelectedResponse("");
                  setCustomerResponse("");
                }}
                style={[
                  tw`px-4 py-2 rounded-lg`,
                  { backgroundColor: "#7cc0d8" },
                ]}
              >
                <Text style={tw`text-white font-bold text-sm`}>Save</Text>
              </TouchableOpacity>
            </View>

            {selectedResponse === "Others" && (
              <TextInput
                value={customerResponse}
                onChangeText={setCustomerResponse}
                placeholder="Enter customer response..."
                multiline
                numberOfLines={3}
                style={tw`border border-gray-300 rounded-lg p-3 text-sm text-gray-800 bg-white`}
              />
            )}
          </View>

          {/* Captured Image */}
          {capturedImage && (
            <View style={tw`mb-4`}>
              <Text
                style={[
                  tw`text-center text-lg font-semibold mb-2`,
                  { color: "#7cc0d8" },
                ]}
              >
                Captured Image
              </Text>
              <TouchableOpacity onPress={() => setImageViewVisible(true)}>
                <View
                  style={tw`border-2 border-dashed border-gray-300 rounded-lg p-2`}
                >
                  <Text style={tw`text-center text-gray-600 text-sm`}>
                    Tap to view captured image
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Location */}
          {capturedImage?.location && (
            <View style={tw`mb-4`}>
              <Text
                style={[
                  tw`text-center text-lg font-semibold mb-2`,
                  { color: "#7cc0d8" },
                ]}
              >
                Location
              </Text>
              <MapWebView
                latitude={capturedImage.location.latitude}
                longitude={capturedImage.location.longitude}
              />
            </View>
          )}

          {/* Visited Toggle */}
          <View
            style={[
              tw`flex-row justify-between items-center p-4 rounded-lg mb-20`,
              { backgroundColor: "#f8fafc" },
            ]}
          >
            <Text style={tw`text-lg font-semibold text-gray-800`}>
              Mark as Visited
            </Text>
            <Switch
              trackColor={{ false: "#ccc", true: "#7cc0d8" }}
              thumbColor={isVisited ? "#fff" : "#f4f3f4"}
              ios_backgroundColor="#ccc"
              onValueChange={handleToggle}
              value={isVisited}
            />
          </View>
        </ScrollView>

        {/* Close Button */}
        <Pressable
          onPress={onClose}
          style={[
            tw`absolute bottom-5 self-center rounded-full px-10 py-3`,
            { backgroundColor: "#7cc0d8" },
          ]}
        >
          <Text style={tw`text-white text-lg font-bold`}>Close</Text>
        </Pressable>

        {/* CustRelated Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <CustRelated
            person={selectedPerson}
            onClose={() => setModalVisible(false)}
          />
        </Modal>

        <Modal visible={cameraVisible} animationType="slide">
          <CameraComponent
            onCapture={handleCapture}
            onClose={() => setCameraVisible(false)}
          />
        </Modal>

        <ImageViewing
          images={[{ uri: capturedImage?.imageUri }]}
          imageIndex={0}
          visible={imageViewVisible}
          onRequestClose={() => setImageViewVisible(false)}
        />
      </View>
    </Animated.View>
  );
};

// Calculate loan balance
const calculateBalance = (person) => {
  const amount = parseFloat(person.loan_amount) || 0;
  const paid = parseFloat(person.paid_amount) || 0;
  return (amount - paid).toFixed(2);
};

const InfoRow = ({ label, value }) => {
  return (
    <View
      style={[
        tw`flex-row justify-between border-b py-3`,
        { borderBottomColor: "#e2e8f0" },
      ]}
    >
      <Text style={tw`text-sm font-semibold text-gray-700 flex-1`}>
        {label}
      </Text>
      <Text style={tw`text-sm text-gray-600 flex-1 text-right`}>
        {value || "N/A"}
      </Text>
    </View>
  );
};

export default DetailedCust;

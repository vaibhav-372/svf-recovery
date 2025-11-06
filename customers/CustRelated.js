import {
  View,
  Text,
  FlatList,
  Dimensions,
  Pressable,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import React, { useRef, useState, useEffect } from "react";
import tw from "tailwind-react-native-classnames";
import ImageViewing from "react-native-image-viewing";
import jewel from "../assets/jewel.webp";
import { Ionicons } from "@expo/vector-icons";
import RNPickerSelect from "react-native-picker-select";
import { useAuth } from "../context/AuthContext";
import PreviousResponsesList from "./PreviousResponsesList";
import PTPreviousResponses from "./PTPreviousResponses";

const { width, height } = Dimensions.get("window");

// Interest calculation function
const calculateLoanInterest = (
  principal,
  rate,
  start_date,
  end_date,
  minimum_days = 0
) => {
  try {
    const startTimeStamp = new Date(start_date).getTime();
    const endTimeStamp = new Date(end_date).getTime() + 87600000;

    // Calculate total number of days (inclusive)
    const timeDiff = Math.abs(endTimeStamp - startTimeStamp);
    const total_days = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;

    // Create Date objects for detailed breakdown
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setDate(endDate.getDate() + 1);

    // Calculate years, months, and days difference
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    let days = endDate.getDate() - startDate.getDate();

    // Adjust for negative days
    if (days < 0) {
      months--;
      const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
      days += prevMonth.getDate();
    }

    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }

    const year = years * 360;
    const month = months * 30;
    let no_of_days = year + month + days;

    let final_total_days = no_of_days;

    if (minimum_days >= no_of_days) {
      final_total_days = minimum_days;
    } else {
      final_total_days = no_of_days;
    }

    const formatted_interval = `${years} Y, ${months} M, ${days} D`;

    let loan = parseFloat(principal);
    const monthly_rate = parseFloat(rate) / 12;
    let year_total_amount = loan;

    if (years >= 1) {
      for (let i = 1; i <= years; i++) {
        loan += (loan * 12 * monthly_rate) / 100;
      }
      year_total_amount = loan;
    }

    const month_interest = (loan * months * monthly_rate) / 100;
    const month_total_amount = year_total_amount + month_interest;

    const daily_rate = monthly_rate / 30;
    const day_interest = (loan * final_total_days * daily_rate) / 100;
    const final_total_amount = month_total_amount + day_interest;

    const interest = Math.round(final_total_amount - principal);

    return {
      interest: interest,
      days: no_of_days,
      formatted_interval: formatted_interval,
    };
  } catch (error) {
    console.log("Interest calculation error:", error);
    return {
      interest: 0,
      days: 0,
      formatted_interval: "N/A",
    };
  }
};

const CustRelated = ({ person, onClose }) => {
  const [customerRecords, setCustomerRecords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageViewVisible, setImageViewVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [individualResponses, setIndividualResponses] = useState({});
  const [existingResponses, setExistingResponses] = useState({});
  const [allPreviousResponses, setAllPreviousResponses] = useState({});
  const [visitedData, setVisitedData] = useState({});
  const [showPreviousResponses, setShowPreviousResponses] = useState(false);
  const [showPTPreviousResponses, setShowPTPreviousResponses] = useState(false);
  const [selectedPT, setSelectedPT] = useState(null);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [imageError, setImageError] = useState(false);
  const flatListRef = useRef(null);

  const { token } = useAuth();
  const SERVER_IP = "192.168.65.11";
  const BASE_URL = `http://${SERVER_IP}:3000`;

  useEffect(() => {
    console.log("CustRelated received person:", person);

    if (!person) {
      console.log("No person data provided");
      setCustomerRecords([]);
      return;
    }

    try {
      const records = person.allPTs || [];
      console.log(`Processing ${records.length} PT records`);

      if (records.length === 0) {
        console.log("No PT records found");
        setCustomerRecords([]);
        return;
      }

      setCustomerRecords(records);

      // Initialize individual responses state with validation
      const initialResponses = {};
      records.forEach((record, index) => {
        if (!record) {
          console.warn(`Invalid record at index ${index}`);
          return;
        }

        const ptNo = record.pt_no || `temp-${index}`;
        initialResponses[ptNo] = {
          response: "",
          description: "",
        };
      });

      setIndividualResponses(initialResponses);

      // Load all data only if we have valid records
      if (records.length > 0 && records[0]) {
        loadAllPreviousResponses(records);
        loadExistingResponses(records);
        loadVisitedStatus(records);
      }
    } catch (error) {
      console.error("Error processing person data:", error);
      setCustomerRecords([]);
    }
  }, [person]);

  // Load all previous responses for all PT numbers
  const loadAllPreviousResponses = async (records) => {
    try {
      if (!person?.customerInfo?.customer_id) {
        console.log("No customer ID available");
        return;
      }

      setLoadingResponses(true);
      const customerId = person.customerInfo.customer_id;

      console.log("Loading previous responses for customer:", customerId);

      const response = await fetch(
        `${BASE_URL}/api/get-all-previous-responses/${customerId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.log(`API error: ${response.status} - ${response.statusText}`);
        setAllPreviousResponses({});
        return;
      }

      const result = await response.json();
      console.log("Previous responses API result:", result);

      if (
        result.success &&
        result.previousResponses &&
        Array.isArray(result.previousResponses)
      ) {
        const responsesByPT = {};
        result.previousResponses.forEach((response, index) => {
          if (!response) {
            console.warn(`Invalid response at index ${index}`);
            return;
          }

          const ptNo = response.pt_no || `unknown-${index}`;
          if (!responsesByPT[ptNo]) {
            responsesByPT[ptNo] = [];
          }
          responsesByPT[ptNo].push(response);
        });

        setAllPreviousResponses(responsesByPT);
      } else {
        console.log("No valid previous responses found");
        setAllPreviousResponses({});
      }
    } catch (error) {
      console.error("Error loading all previous responses:", error);
      setAllPreviousResponses({});
    } finally {
      setLoadingResponses(false);
    }
  };

  const loadVisitedStatus = async (records) => {
    try {
      if (!person?.customerInfo?.customer_id) {
        console.log("No customer ID available for visited status");
        return;
      }

      const customerId = person.customerInfo.customer_id;
      const response = await fetch(
        `${BASE_URL}/api/get-visited-status/${customerId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.visitedData) {
          setVisitedData(result.visitedData);
        } else {
          setVisitedData({});
        }
      } else {
        console.log("Failed to load visited status, status:", response.status);
        setVisitedData({});
      }
    } catch (error) {
      console.error("Error loading visited status:", error);
      setVisitedData({});
    }
  };

  const loadExistingResponses = async (records) => {
    try {
      if (!person?.customerInfo?.customer_id) {
        console.log("No customer ID available for existing responses");
        return;
      }

      const customerId = person.customerInfo.customer_id;
      const response = await fetch(
        `${BASE_URL}/api/get-existing-responses/${customerId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.existingResponses) {
          setExistingResponses(result.existingResponses);

          // Pre-fill individual responses with existing data
          const updatedResponses = { ...individualResponses };
          records.forEach((record) => {
            if (!record) return;

            const ptNo = record.pt_no;
            if (!ptNo) return;

            const existingResponse = result.existingResponses[ptNo];
            if (existingResponse) {
              updatedResponses[ptNo] = {
                response: existingResponse.response_text || "",
                description: existingResponse.response_description || "",
              };
            }
          });
          setIndividualResponses(updatedResponses);
        } else {
          console.log("No existing responses found");
          setExistingResponses({});
        }
      } else {
        console.log(
          "Failed to load existing responses, status:",
          response.status
        );
        setExistingResponses({});
      }
    } catch (error) {
      console.error("Error loading existing responses:", error);
      setExistingResponses({});
    }
  };

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  });

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const openPreviousResponses = (ptNo) => {
    if (!ptNo) {
      console.log("No PT number provided for previous responses");
      return;
    }
    setSelectedPT(ptNo);
    setShowPTPreviousResponses(true);
  };

  // Helper function to get display value
  const getDisplayValue = (item, key) => {
    if (!item || !key) return "0";
    const value = item[key] || "0";
    return value;
  };

  // Helper function to extract date only from datetime string
  const getDateOnly = (dateString) => {
    if (!dateString || dateString === "N/A") return "N/A";

    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }

      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "N/A";
      }

      return date.toISOString().split("T")[0];
    } catch (error) {
      console.log("Date parsing error:", error);
      return "N/A";
    }
  };

  // Calculate interest amount for a loan record
  const calculateInterestAmount = (item) => {
    if (!item) return "N/A";

    const principal = parseFloat(getDisplayValue(item, "loan_amount")) || 0;
    const rate = parseFloat(getDisplayValue(item, "interest_rate")) || 0;
    const startDate = getDisplayValue(item, "loan_created_date");
    const endDate = getDisplayValue(item, "last_date");

    if (
      startDate === "N/A" ||
      endDate === "N/A" ||
      principal === 0 ||
      rate === 0
    ) {
      return "N/A";
    }

    let minimum_days_for_interest;

    if (rate == "24") {
      minimum_days_for_interest = 15;
    } else {
      minimum_days_for_interest = 30;
    }

    const result = calculateLoanInterest(
      principal,
      rate,
      startDate,
      endDate,
      minimum_days_for_interest
    );
    return result.interest;
  };

  // Get customer name safely
  const getCustomerName = () => {
    if (person && person.customerInfo) {
      return (
        person.customerInfo.customer_name ||
        person.customerInfo.name ||
        "Customer"
      );
    }
    return "Customer";
  };

  // Get customer ID safely
  const getCustomerId = () => {
    if (person && person.customerInfo) {
      return person.customerInfo.customer_id;
    }
    return null;
  };

  // Handle individual response change
  const handleIndividualResponseChange = (ptNo, field, value) => {
    if (!ptNo) {
      console.log("No PT number provided for response change");
      return;
    }

    setIndividualResponses((prev) => ({
      ...prev,
      [ptNo]: {
        ...prev[ptNo],
        [field]: value,
      },
    }));
  };

  // Render previous responses section for each PT
  const renderPreviousResponsesSection = (ptNo) => {
    if (!ptNo) return null;

    const ptResponses = allPreviousResponses[ptNo] || [];
    const hasPreviousResponses = ptResponses.length > 0;

    if (!hasPreviousResponses) {
      return null;
    }

    return (
      <View
        style={[
          tw`border rounded-lg p-3 mb-4`,
          { borderColor: "#f59e0b", backgroundColor: "#fffbeb" },
        ]}
      >
        <TouchableOpacity
          onPress={() => openPreviousResponses(ptNo)}
          style={tw`flex-row justify-between items-center`}
        >
          <View style={tw`flex-1`}>
            <Text
              style={[tw`text-lg font-semibold mb-2`, { color: "#f59e0b" }]}
            >
              📋 Previous Visit Responses ({ptResponses.length})
            </Text>

            {/* Tap instruction */}
            <Text style={tw`text-xs text-blue-500 mt-2`}>
              👉 Tap to view all {ptResponses.length} previous visit responses
              for this PT
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
        </TouchableOpacity>
      </View>
    );
  };

  const saveIndividualResponse = async (ptNo) => {
    if (!ptNo) {
      Alert.alert("Error", "No PT number provided");
      return;
    }

    const responseData = individualResponses[ptNo];

    if (!responseData || !responseData.response) {
      Alert.alert(
        "Response Required",
        "Please select a response for this PT number."
      );
      return;
    }

    if (
      responseData.response === "Others" &&
      (!responseData.description || !responseData.description.trim())
    ) {
      Alert.alert(
        "Description Required",
        "Please provide a description for the 'Others' response."
      );
      return;
    }

    try {
      setSaving(true);

      let imageUrl = null;
      const customerId = getCustomerId();

      if (!customerId) {
        Alert.alert("Error", "Customer ID not found");
        return;
      }

      const existingResponse = existingResponses[ptNo];
      if (existingResponse && existingResponse.image_url) {
        imageUrl = existingResponse.image_url;
      } else {
        const anyResponse = Object.values(existingResponses).find(
          (resp) => resp && resp.image_url
        );
        if (anyResponse) {
          imageUrl = anyResponse.image_url;
        }
      }

      let finalResponseDescription = responseData.description;

      if (responseData.response === "Others") {
        finalResponseDescription = responseData.description;
      } else {
        finalResponseDescription = responseData.description || "";
      }

      const saveData = {
        customer_id: customerId,
        pt_no: ptNo,
        response_type: responseData.response,
        response_description: finalResponseDescription,
        image_url: imageUrl,
        latitude: null,
        longitude: null,
      };

      console.log("Saving individual response for PT:", ptNo, saveData);

      const response = await fetch(`${BASE_URL}/api/save-individual-response`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saveData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response error:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("Individual response saved successfully:", result);

        setExistingResponses((prev) => ({
          ...prev,
          [ptNo]: {
            response_text: responseData.response,
            response_description: finalResponseDescription,
            image_url: imageUrl,
            pt_no: ptNo,
          },
        }));

        // Reload all previous responses to include the new one
        loadAllPreviousResponses(customerRecords);

        Alert.alert(
          "Success",
          `Response ${result.updated ? "updated" : "saved"} successfully for PT number: ${ptNo}!`,
          [{ text: "OK" }]
        );
      } else {
        throw new Error(result.message || "Failed to save response");
      }
    } catch (error) {
      console.error("Error in individual save process:", error);
      Alert.alert("Error", "Failed to save response. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Calculate loan balance
  const calculateBalance = (item) => {
    if (!item) return "0.00";

    const amount = parseFloat(getDisplayValue(item, "loan_amount")) || 0;
    const paid = parseFloat(getDisplayValue(item, "paid_amount")) || 0;
    return (amount - paid).toFixed(2);
  };

  const handleImageError = () => {
    console.log("Jewel image failed to load");
    setImageError(true);
  };

  const renderItem = ({ item, index }) => {
    // Safety check
    if (!item) {
      return (
        <View style={[tw`p-4`, { width: width - 32 }]}>
          <Text style={tw`text-red-500`}>Invalid record data</Text>
        </View>
      );
    }

    const ptNo = getDisplayValue(item, "pt_no") || `Record ${index + 1}`;
    const currentResponse = individualResponses[ptNo] || {
      response: "",
      description: "",
    };

    const existingResponse = existingResponses[ptNo];
    const ptResponses = allPreviousResponses[ptNo] || [];
    const hasPreviousResponses = ptResponses.length > 0;

    return (
      <ScrollView
        style={[tw`p-4`, { width: width - 32 }]}
        contentContainerStyle={{ minHeight: height - 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* PT Number Header */}
        <View style={[tw`mb-4 p-4 rounded-lg`, { backgroundColor: "#7cc0d8" }]}>
          <View style={tw`flex-row justify-between items-center`}>
            <View style={tw`flex-1`}>
              <Text style={tw`text-center text-lg font-bold text-white`}>
                PT Number: {ptNo}
              </Text>
              <Text style={tw`text-center text-sm text-white opacity-90 mt-1`}>
                Record {index + 1} of {customerRecords.length}
              </Text>
              {hasPreviousResponses && (
                <Text
                  style={tw`text-center text-xs text-white opacity-90 mt-1`}
                >
                  {ptResponses.length} previous response(s)
                </Text>
              )}
            </View>
            {hasPreviousResponses && (
              <TouchableOpacity
                onPress={() => openPreviousResponses(ptNo)}
                style={tw`bg-green-500 px-3 py-1 rounded-full`}
              >
                <Text style={tw`text-white text-xs font-bold`}>
                  View All ({ptResponses.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Show previous responses section if available */}
        {renderPreviousResponsesSection(ptNo)}

        {/* Current Visit Response Section */}
        <View
          style={[tw`border-2 rounded-lg p-4 mb-4`, { borderColor: "#7cc0d8" }]}
        >
          <Text
            style={[
              tw`text-lg font-semibold mb-3 text-center`,
              { color: "#7cc0d8" },
            ]}
          >
            Current Visit Response
          </Text>

          {/* Show existing response status */}
          {existingResponse && (
            <View style={tw`mb-3`}>
              <View
                style={tw`bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2`}
              >
                <Text
                  style={tw`text-blue-800 text-sm text-center font-semibold`}
                >
                  ✅ Response already saved for current visit
                </Text>
                <Text style={tw`text-blue-700 text-xs text-center mt-1`}>
                  Last updated:{" "}
                  {existingResponse.response_timestamp
                    ? new Date(
                        existingResponse.response_timestamp
                      ).toLocaleString()
                    : "Recently"}
                </Text>
              </View>

              {/* Show existing image status */}
              {existingResponse.image_url && (
                <View
                  style={tw`bg-green-50 border border-green-200 rounded-lg p-2`}
                >
                  <Text style={tw`text-green-700 text-xs text-center`}>
                    📸 Image captured for current visit
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Response Selection */}
          <View style={tw`mb-3`}>
            <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
              Select Response:
            </Text>
            <View style={tw`border border-gray-300 rounded-lg bg-white`}>
              <RNPickerSelect
                onValueChange={(value) =>
                  handleIndividualResponseChange(ptNo, "response", value)
                }
                value={currentResponse.response}
                placeholder={{
                  label: existingResponse
                    ? "Update response..."
                    : "Select response...",
                  value: "",
                }}
                items={[
                  { label: "Call not lifting", value: "Call not lifting" },
                  { label: "1111111111111111", value: "1111111111111111" },
                  {
                    label: "Customer not at home",
                    value: "Customer not at home",
                  },
                  { label: "Requested time", value: "Requested time" },
                  { label: "Others", value: "Others" },
                ]}
                style={{
                  inputAndroid: {
                    ...tw`text-sm text-gray-800 pl-3 pr-3 py-3`,
                  },
                  inputIOS: {
                    ...tw`text-sm text-gray-800 pl-3 pr-3 py-3`,
                  },
                  placeholder: {
                    color: "gray",
                  },
                }}
              />
            </View>
          </View>

          {/* Response Description */}
          <View style={tw`mb-3`}>
            <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
              Description:
            </Text>
            <TextInput
              value={currentResponse.description}
              onChangeText={(value) =>
                handleIndividualResponseChange(ptNo, "description", value)
              }
              placeholder={
                existingResponse && existingResponse.response_description
                  ? "Update description..."
                  : "Enter response description..."
              }
              multiline
              numberOfLines={3}
              style={tw`border border-gray-300 rounded-lg p-3 text-sm text-gray-800 bg-white`}
            />
          </View>

          {/* Save Individual Response Button */}
          <TouchableOpacity
            onPress={() => saveIndividualResponse(ptNo)}
            disabled={saving || !currentResponse.response}
            style={[
              tw`rounded-full px-6 py-3 mt-2`,
              {
                backgroundColor: currentResponse.response
                  ? "#10b981"
                  : "#9ca3af",
                opacity: currentResponse.response ? 1 : 0.6,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={tw`text-white text-lg font-bold text-center`}>
                {existingResponse ? "Update Response" : "Save Response"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Loan Details Section */}
        <View
          style={[
            tw`border mb-4 p-4 rounded-lg`,
            { borderColor: "#7cc0d8", backgroundColor: "#f8fafc" },
          ]}
        >
          <Text
            style={[
              tw`text-lg font-semibold mb-3 text-center`,
              { color: "#7cc0d8" },
            ]}
          >
            Loan Details
          </Text>
          <InfoRow
            label="Loan Amount"
            value={getDisplayValue(item, "loan_amount")}
          />
          <InfoRow
            label="Paid Amount"
            value={getDisplayValue(item, "paid_amount")}
          />
          <InfoRow label="Balance" value={calculateBalance(item)} />
          <InfoRow
            label="Interest Rate"
            value={getDisplayValue(item, "interest_rate")}
          />
          <InfoRow
            label="Interest Amount"
            value={calculateInterestAmount(item)}
          />
          <InfoRow label="Tenure" value={getDisplayValue(item, "tenure")} />
          <InfoRow
            label="Loan Created"
            value={getDateOnly(getDisplayValue(item, "loan_created_date"))}
          />
          <InfoRow
            label="Last Date"
            value={getDateOnly(getDisplayValue(item, "last_date"))}
          />
          <InfoRow
            label="1st Letter"
            value={getDateOnly(getDisplayValue(item, "first_letter_date"))}
          />
          <InfoRow
            label="2nd Letter"
            value={getDateOnly(getDisplayValue(item, "second_letter_date"))}
          />
          <InfoRow
            label="3rd Letter"
            value={getDateOnly(getDisplayValue(item, "final_letter_date"))}
          />
        </View>

        {/* Ornament Details Section */}
        <View
          style={[
            tw`border mb-4 p-4 rounded-lg`,
            { borderColor: "#7cc0d8", backgroundColor: "#f8fafc" },
          ]}
        >
          <Text
            style={[
              tw`text-lg font-semibold mb-3 text-center`,
              { color: "#7cc0d8" },
            ]}
          >
            Ornament Details
          </Text>
          <InfoRow
            label="Ornament Type"
            value={getDisplayValue(item, "ornament_name")}
          />
          <InfoRow
            label="Gross Weight"
            value={getDisplayValue(item, "gross_weight")}
          />
          <InfoRow
            label="Net Weight"
            value={getDisplayValue(item, "net_weight")}
          />

          <TouchableOpacity
            onPress={() => setImageViewVisible(true)}
            style={tw`items-center mt-3`}
          >
            {imageError ? (
              <View
                style={[
                  tw`justify-center items-center bg-gray-100`,
                  { width: 150, height: 150 },
                ]}
              >
                <Ionicons name="image-outline" size={40} color="#9ca3af" />
                <Text style={tw`text-gray-500 text-xs mt-2`}>
                  Image not available
                </Text>
              </View>
            ) : (
              <Image
                source={jewel}
                style={[
                  tw`self-center`,
                  { width: 150, height: 150, resizeMode: "contain" },
                ]}
                onError={handleImageError}
              />
            )}
            <Text style={tw`text-blue-500 text-sm mt-2`}>Ornament Image</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const safeCustomerId = getCustomerId();
  const safeCustomerName = getCustomerName();

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Header */}
      <View style={tw`px-4 py-3 border-b border-gray-200`}>
        {/* Header */}
        <View style={tw`px-4 py-3 border-b border-gray-200`}>
          <View style={tw`flex-row justify-between items-center`}>
            <View style={tw`flex-1`}>
              <Text style={tw`text-center text-xl font-bold text-gray-800`}>
                {safeCustomerName}
              </Text>
              <Text style={tw`text-center text-sm text-gray-600 mt-1`}>
                {customerRecords.length} Loan Account(s)
              </Text>
            </View>

            {/* Close Button (X) in top right */}
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#ef4444" />
            </TouchableOpacity>
          </View>

          {/* Updated summary text */}
          <Text style={tw`text-center text-xs text-blue-600 mt-1`}>
            {Object.values(allPreviousResponses).reduce(
              (total, responses) => total + (responses ? responses.length : 0),
              0
            ) > 0
              ? `${Object.values(allPreviousResponses).reduce((total, responses) => total + (responses ? responses.length : 0), 0)} total responses across all PTs`
              : "No previous visit responses"}
          </Text>

          {loadingResponses && (
            <View style={tw`flex-row justify-center items-center mt-1`}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={tw`text-xs text-blue-600 ml-2`}>
                Loading responses...
              </Text>
            </View>
          )}
        </View>

        {loadingResponses && (
          <View style={tw`flex-row justify-center items-center mt-1`}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={tw`text-xs text-blue-600 ml-2`}>
              Loading responses...
            </Text>
          </View>
        )}
      </View>

      {customerRecords.length > 0 ? (
        <>
          {/* Horizontal PT Records */}
          <FlatList
            ref={flatListRef}
            data={customerRecords}
            renderItem={renderItem}
            keyExtractor={(item, index) => {
              if (!item) {
                return `empty-${index}`;
              }

              const ptNo = getDisplayValue(item, "pt_no");
              if (!ptNo || ptNo === "N/A") {
                return `no-pt-${index}`;
              }

              return `pt-${ptNo}-${index}`;
            }}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewRef.current}
            viewabilityConfig={viewConfigRef.current}
            snapToInterval={width}
            decelerationRate="fast"
            style={tw`flex-1`}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
          />
        </>
      ) : (
        <View style={tw`flex-1 justify-center items-center p-4`}>
          <Ionicons name="alert-circle-outline" size={50} color="#ef4444" />
          <Text style={tw`text-lg text-red-500 text-center mt-2`}>
            No loan records found
          </Text>
        </View>
      )}

      {/* Close Button */}
      <Pressable
        onPress={() => setShowPreviousResponses(true)}
        style={[
          tw`absolute bottom-3 self-center px-6 py-3 rounded-full`,
          { backgroundColor: "#3b82f6" },
        ]}
      >
        <Text style={tw`text-white text-lg font-bold`}>View All Responses</Text>
      </Pressable>

      <ImageViewing
        images={[require("../assets/jewel.webp")]}
        imageIndex={0}
        visible={imageViewVisible}
        onRequestClose={() => setImageViewVisible(false)}
        onImageLoadError={() => setImageError(true)}
      />

      {/* Previous Responses Modals */}
      {safeCustomerId && (
        <>
          <PreviousResponsesList
            visible={showPreviousResponses}
            onClose={() => setShowPreviousResponses(false)}
            customerId={safeCustomerId}
            token={token}
            BASE_URL={BASE_URL}
            customerName={safeCustomerName}
          />
          <PTPreviousResponses
            visible={showPTPreviousResponses}
            onClose={() => {
              setShowPTPreviousResponses(false);
              setSelectedPT(null);
            }}
            customerId={safeCustomerId}
            ptNo={selectedPT}
            token={token}
            BASE_URL={BASE_URL}
            customerName={safeCustomerName}
          />
        </>
      )}
    </View>
  );
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

export default CustRelated;

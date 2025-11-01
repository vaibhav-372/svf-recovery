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

// Interest calculation function (keep this as is)
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
  const [visitedData, setVisitedData] = useState({});
  const [showPreviousResponses, setShowPreviousResponses] = useState(false);
  const [showPTPreviousResponses, setShowPTPreviousResponses] = useState(false);
  const [selectedPT, setSelectedPT] = useState(null);
  const flatListRef = useRef(null);

  const { token } = useAuth();
  const SERVER_IP = "192.168.65.11";
  const BASE_URL = `http://${SERVER_IP}:3000`;

  useEffect(() => {
    console.log("CustRelated received:", person);

    if (person && person.allPTs) {
      const records = person.allPTs;
      setCustomerRecords(records);

      // Initialize individual responses state and load existing responses
      const initialResponses = {};
      records.forEach((record) => {
        const ptNo = record.pt_no;
        initialResponses[ptNo] = {
          response: "",
          description: "",
        };
      });

      setIndividualResponses(initialResponses);
      loadExistingResponses(records);
      loadVisitedStatus(records);

      console.log(`Loaded ${records.length} PT records`);
    } else {
      setCustomerRecords([]);
      setIndividualResponses({});
      setExistingResponses({});
      setVisitedData({});
    }
  }, [person]);

  const loadVisitedStatus = async (records) => {
    try {
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
          console.log("Previous visit data loaded:", result.visitedData);
        } else {
          console.log("No previous visited data found");
          setVisitedData({});
        }
      }
    } catch (error) {
      console.error("Error loading visited status:", error);
      setVisitedData({});
    }
  };

  // Load existing responses for all PT numbers
  const loadExistingResponses = async (records) => {
    try {
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
            const ptNo = record.pt_no;
            const existingResponse = result.existingResponses[ptNo];
            if (existingResponse) {
              updatedResponses[ptNo] = {
                response: existingResponse.response_text || "",
                description: existingResponse.response_description || "",
              };
            }
          });
          setIndividualResponses(updatedResponses);

          console.log("Existing responses loaded:", result.existingResponses);
        } else {
          console.log("No existing responses found");
          setExistingResponses({});
        }
      } else {
        console.log("Failed to load existing responses");
        setExistingResponses({});
      }
    } catch (error) {
      console.error("Error loading existing responses:", error);
      setExistingResponses({});
    }
  };

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  });

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const openPreviousResponses = (ptNo) => {
    setSelectedPT(ptNo);
    setShowPTPreviousResponses(true);
  };

  // Helper function to get display value
  const getDisplayValue = (item, key) => {
    const value = item[key] || "N/A";
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

    console.log("rate of interest:", rate);

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

  // Handle individual response change
  const handleIndividualResponseChange = (ptNo, field, value) => {
    setIndividualResponses((prev) => ({
      ...prev,
      [ptNo]: {
        ...prev[ptNo],
        [field]: value,
      },
    }));
  };

  // Check if a specific PT has been visited
  const isPTVisited = (ptNo) => {
    return visitedData[ptNo] && visitedData[ptNo].isVisited === 1;
  };

  // Get visited response data for a PT
  const getVisitedResponseData = (ptNo) => {
    return visitedData[ptNo] || null;
  };

  const saveIndividualResponse = async (ptNo) => {
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
      const customerId = person.customerInfo.customer_id;

      const existingResponse = existingResponses[ptNo];
      if (existingResponse && existingResponse.image_url) {
        imageUrl = existingResponse.image_url;
      } else {
        const anyResponse = Object.values(existingResponses).find(
          (resp) => resp.image_url
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

  // Render previous responses section for each PT
  const renderPreviousResponsesSection = (ptNo) => {
    const visitedData = getVisitedResponseData(ptNo);
    const hasPreviousVisit = visitedData !== null;

    if (!hasPreviousVisit) return null;

    return (
      <View style={[tw`border rounded-lg p-3 mb-4`, { borderColor: "#f59e0b" }]}>
        <TouchableOpacity 
          onPress={() => openPreviousResponses(ptNo)}
          style={tw`flex-row justify-between items-center`}
        >
          <View style={tw`flex-1`}>
            <Text style={[tw`text-lg font-semibold`, { color: "#f59e0b" }]}>
              📋 Previous Visit Responses
            </Text>
            <Text style={tw`text-sm text-gray-600 mt-1`}>
              Tap to view all previous visit responses for this PT number
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item, index }) => {
    const ptNo = getDisplayValue(item, "pt_no");
    const currentResponse = individualResponses[ptNo] || {
      response: "",
      description: "",
    };
    const existingResponse = existingResponses[ptNo];
    const hasPreviousVisit = isPTVisited(ptNo);

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
            </View>
            {hasPreviousVisit && (
              <TouchableOpacity 
                onPress={() => openPreviousResponses(ptNo)}
                style={tw`bg-green-500 px-3 py-1 rounded-full`}
              >
                <Text style={tw`text-white text-xs font-bold`}>
                  Previous visits
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
            <Image
              source={jewel}
              style={[
                tw`self-center`,
                { width: 150, height: 150, resizeMode: "contain" },
              ]}
            />
            <Text style={tw`text-blue-500 text-sm mt-2`}>Ornament Image</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Calculate loan balance
  const calculateBalance = (item) => {
    const amount = parseFloat(getDisplayValue(item, "loan_amount")) || 0;
    const paid = parseFloat(getDisplayValue(item, "paid_amount")) || 0;
    return (amount - paid).toFixed(2);
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Header */}
      <View style={tw`px-4 py-3 border-b border-gray-200`}>
        <View style={tw`flex-row justify-between items-center`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-center text-xl font-bold text-gray-800`}>
              {getCustomerName()}
            </Text>
            <Text style={tw`text-center text-sm text-gray-600 mt-1`}>
              {customerRecords.length} Loan Account(s)
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowPreviousResponses(true)}
            style={tw`ml-4 p-2 bg-blue-100 rounded-lg`}
          >
            <Ionicons name="list" size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        <Text style={tw`text-center text-xs text-blue-600 mt-1`}>
          {Object.keys(visitedData).length > 0
            ? "Previous visit responses available"
            : "No previous visit responses"}
        </Text>
      </View>

      {customerRecords.length > 0 ? (
        <>
          {/* Horizontal PT Records */}
          <FlatList
            ref={flatListRef}
            data={customerRecords}
            renderItem={renderItem}
            keyExtractor={(item, index) => {
              const ptNo = getDisplayValue(item, "pt_no") || index;
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
        onPress={onClose}
        style={[
          tw`absolute bottom-3 self-center px-6 py-3 rounded-full`,
          { backgroundColor: "#7cc0d8" },
        ]}
      >
        <Text style={tw`text-white text-lg font-bold`}>Close</Text>
      </Pressable>

      <ImageViewing
        images={[require("../assets/jewel.webp")]}
        imageIndex={0}
        visible={imageViewVisible}
        onRequestClose={() => setImageViewVisible(false)}
      />

      <PreviousResponsesList
        visible={showPreviousResponses}
        onClose={() => setShowPreviousResponses(false)}
        customerId={person?.customerInfo?.customer_id}
        token={token}
        BASE_URL={BASE_URL}
        customerName={getCustomerName()}
      />

      <PTPreviousResponses
        visible={showPTPreviousResponses}
        onClose={() => {
          setShowPTPreviousResponses(false);
          setSelectedPT(null);
        }}
        customerId={person?.customerInfo?.customer_id}
        ptNo={selectedPT}
        token={token}
        BASE_URL={BASE_URL}
        customerName={getCustomerName()}
      />
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
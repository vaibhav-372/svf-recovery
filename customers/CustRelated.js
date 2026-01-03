import {
  View,
  Text,
  Dimensions,
  Pressable,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
  Platform,
  ScrollView,
} from "react-native";
import React, { useState, useEffect, useCallback, useRef } from "react";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import RNPickerSelect from "react-native-picker-select";
import { useAuth } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");

// Import images normally
import jewel from "../assets/jewel.webp";
import { SafeAreaView } from "react-native-safe-area-context";

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

    const timeDiff = Math.abs(endTimeStamp - startTimeStamp);
    const total_days = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setDate(endDate.getDate() + 1);

    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    let days = endDate.getDate() - startDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
      days += prevMonth.getDate();
    }

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

// Memoized card item to prevent re-renders
const CardItem = React.memo(
  ({
    item,
    index,
    totalRecords,
    currentResponse,
    existingResponse,
    ptResponses,
    handleIndividualResponseChange,
    saveIndividualResponse,
    saving,
    getDisplayValue,
    calculateBalance,
    calculateInterestAmount,
    getDateOnly,
    openPreviousResponses,
  }) => {
    const ptNo = getDisplayValue(item, "pt_no") || `Record ${index + 1}`;
    const hasPreviousResponses = ptResponses.length > 0;
    const hasExistingResponse = !!existingResponse;

    // Check if existing response has image and location
    const hasCompleteResponse =
      hasExistingResponse &&
      existingResponse.image_url &&
      existingResponse.latitude &&
      existingResponse.longitude;

    return (
      <View style={[tw`p-4`, { width, flex: 1 }]}>
        {/* PT Number Header */}
        <View style={[tw`mb-4 p-4 rounded-lg`, { backgroundColor: "#7cc0d8" }]}>
          <View style={tw`flex-row justify-between items-center`}>
            <View style={tw`flex-1`}>
              <Text style={tw`text-center text-lg font-bold text-white`}>
                PT Number: {ptNo}
              </Text>
              <Text style={tw`text-center text-sm text-white opacity-90 mt-1`}>
                Card {index + 1} of {totalRecords}
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
                activeOpacity={0.7}
              >
                <Text style={tw`text-white text-xs font-bold`}>
                  View All ({ptResponses.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Scrollable content inside card */}
        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
        >
          {/* Previous Responses Section */}
          {hasPreviousResponses && (
            <View
              style={[
                tw`border rounded-lg p-3 mb-4`,
                { borderColor: "#f59e0b", backgroundColor: "#fffbeb" },
              ]}
            >
              <TouchableOpacity
                onPress={() => openPreviousResponses(ptNo)}
                style={tw`flex-row justify-between items-center`}
                activeOpacity={0.7}
              >
                <View style={tw`flex-1`}>
                  <Text
                    style={[
                      tw`text-lg font-semibold mb-2`,
                      { color: "#f59e0b" },
                    ]}
                  >
                    📋 Previous Visit Responses ({ptResponses.length})
                  </Text>
                  {/* <Text style={tw`text-xs text-blue-500 mt-2`}>
                    👉 Tap to view all {ptResponses.length} previous visit
                    responses
                  </Text> */}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
              </TouchableOpacity>
            </View>
          )}

          {/* Current Visit Response Section */}
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
              Current Visit Response
            </Text>

            {existingResponse ? (
              <>
                {/* Existing Response Info */}
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

                  {/* {existingResponse.image_url ? (
                    <View
                      style={tw`bg-green-50 border border-green-200 rounded-lg p-2 mb-2`}
                    >
                      <Text style={tw`text-green-700 text-xs text-center`}>
                        📸 Image captured for current visit
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={tw`bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2`}
                    >
                      <Text style={tw`text-yellow-700 text-xs text-center`}>
                        ⚠️ No image captured for this response
                      </Text>
                    </View>
                  )}

                  {existingResponse.location_cordinates ? (
                    <View
                      style={tw`bg-green-50 border border-green-200 rounded-lg p-2`}
                    >
                      <Text style={tw`text-green-700 text-xs text-center`}>
                        📍 Location captured for current visit
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={tw`bg-yellow-50 border border-yellow-200 rounded-lg p-2`}
                    >
                      <Text style={tw`text-yellow-700 text-xs text-center`}>
                        ⚠️ No location captured for this response
                      </Text>
                    </View>
                  )} */}
                </View>

                {/* Response Selection - Enabled for updates */}
                <View style={tw`mb-3`}>
                  <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
                    Update Response:
                  </Text>
                  <View style={tw`border border-gray-300 rounded-lg bg-white`}>
                    <RNPickerSelect
                      onValueChange={(value) =>
                        handleIndividualResponseChange(ptNo, "response", value)
                      }
                      value={currentResponse.response}
                      placeholder={{
                        label: "Update response...",
                        value: "",
                      }}
                      items={[
                        {
                          label: "Call not lifting",
                          value: "Call not lifting",
                        },
                        {
                          label: "1111111111111111",
                          value: "1111111111111111",
                        },
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
                        placeholder: { color: "gray" },
                      }}
                    />
                  </View>
                </View>

                {/* Response Description - Enabled for updates */}
                <View style={tw`mb-3`}>
                  <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
                    Update Description:
                  </Text>
                  <TextInput
                    value={currentResponse.description}
                    onChangeText={(value) =>
                      handleIndividualResponseChange(ptNo, "description", value)
                    }
                    placeholder="Update response description..."
                    multiline
                    numberOfLines={3}
                    style={tw`border border-gray-300 rounded-lg p-3 text-sm text-gray-800 bg-white`}
                    scrollEnabled={false}
                  />
                </View>

                {/* Update Response Button */}
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
                  activeOpacity={0.7}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={tw`text-white text-lg font-bold text-center`}>
                      Update Response
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              /* No existing response - show guidance */
              <View
                style={tw`p-4 bg-yellow-50 border border-yellow-200 rounded-lg`}
              >
                <View style={tw`items-center mb-3`}>
                  <Ionicons
                    name="information-circle"
                    size={40}
                    color="#f59e0b"
                  />
                </View>
                <Text style={tw`text-yellow-600 text-xs text-center`}>
                  This screen only allows updating existing responses that
                  already have image and location data.
                </Text>
              </View>
            )}
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

            <TouchableOpacity style={tw`items-center mt-3`} activeOpacity={0.7}>
              <Image
                source={jewel}
                style={{ width: 150, height: 150, resizeMode: "contain" }}
                fadeDuration={300}
              />
              <Text style={tw`text-blue-500 text-sm mt-2`}>Ornament Image</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }
);

const CustRelated = ({ person, onClose }) => {
  const [customerRecords, setCustomerRecords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [individualResponses, setIndividualResponses] = useState({});
  const [existingResponses, setExistingResponses] = useState({});
  const [allPreviousResponses, setAllPreviousResponses] = useState({});
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [showPreviousResponses, setShowPreviousResponses] = useState(false);
  const [showPTPreviousResponses, setShowPTPreviousResponses] = useState(false);
  const [selectedPT, setSelectedPT] = useState(null);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [loadingPTPrevious, setLoadingPTPrevious] = useState(false);

  const flatListRef = useRef(null);
  const loadTimeoutRef = useRef(null);

  const { token } = useAuth();
  const SERVER_IP = "192.168.65.11";
  const BASE_URL = `http://${SERVER_IP}:3000`;

  // State for lazy loaded components
  const [PreviousResponsesListComponent, setPreviousResponsesListComponent] =
    useState(null);
  const [PTPreviousResponsesComponent, setPTPreviousResponsesComponent] =
    useState(null);

  // Lazy load heavy components
  // useEffect(() => {
  //   if (showPreviousResponses && !PreviousResponsesListComponent) {
  //     import("./PreviousResponsesList").then((module) => {
  //       setPreviousResponsesListComponent(() => module.default);
  //     });
  //   }
  // }, [showPreviousResponses]);

  // useEffect(() => {
  //   if (showPTPreviousResponses && !PTPreviousResponsesComponent) {
  //     import("./PTPreviousResponses").then((module) => {
  //       setPTPreviousResponsesComponent(() => module.default);
  //     });
  //   }
  // }, [showPTPreviousResponses]);

  // Update the lazy loading useEffect hooks:
  useEffect(() => {
    let isMounted = true;

    if (showPreviousResponses && !PreviousResponsesListComponent) {
      import("./PreviousResponsesList")
        .then((module) => {
          if (isMounted) {
            setPreviousResponsesListComponent(() => module.default);
          }
        })
        .catch((error) => {
          console.error("Failed to load PreviousResponsesList:", error);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [showPreviousResponses]);

  useEffect(() => {
    let isMounted = true;

    if (showPTPreviousResponses && !PTPreviousResponsesComponent) {
      import("./PTPreviousResponses")
        .then((module) => {
          if (isMounted) {
            setPTPreviousResponsesComponent(() => module.default);
          }
        })
        .catch((error) => {
          console.error("Failed to load PTPreviousResponses:", error);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [showPTPreviousResponses]);

  useEffect(() => {
    if (!person) {
      setCustomerRecords([]);
      return;
    }

    try {
      const records = person.allPTs || [];
      if (records.length === 0) {
        setCustomerRecords([]);
        return;
      }

      setCustomerRecords(records);

      const initialResponses = {};
      records.forEach((record, index) => {
        if (!record) return;
        const ptNo = record.pt_no || `temp-${index}`;
        initialResponses[ptNo] = {
          response: "",
          description: "",
        };
      });

      setIndividualResponses(initialResponses);

      // Load data with debounce
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      loadTimeoutRef.current = setTimeout(() => {
        if (records.length > 0 && records[0]) {
          loadAllPreviousResponses(records);
          loadExistingResponses(records);
        }
      }, 300);
    } catch (error) {
      console.error("Error processing person data:", error);
      setCustomerRecords([]);
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [person]);

  const getDisplayValue = useCallback((item, key) => {
    if (!item || !key) return "0";
    return item[key] || "0";
  }, []);

  const getDateOnly = useCallback((dateString) => {
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
      return "N/A";
    }
  }, []);

  const loadAllPreviousResponses = useCallback(
    async (records) => {
      try {
        if (!person?.customerInfo?.customer_id) return;

        setLoadingResponses(true);
        const customerId = person.customerInfo.customer_id;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          `${BASE_URL}/api/get-all-previous-responses/${customerId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) return;

        const result = await response.json();

        if (
          result.success &&
          result.previousResponses &&
          Array.isArray(result.previousResponses)
        ) {
          const responsesByPT = {};
          result.previousResponses.forEach((response) => {
            if (!response) return;
            const ptNo = response.pt_no || `unknown`;
            if (!responsesByPT[ptNo]) {
              responsesByPT[ptNo] = [];
            }
            responsesByPT[ptNo].push(response);
          });

          setAllPreviousResponses(responsesByPT);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error loading responses:", error);
        }
      } finally {
        setLoadingResponses(false);
      }
    },
    [person, token, BASE_URL]
  );

  const loadExistingResponses = useCallback(
    async (records) => {
      try {
        if (!person?.customerInfo?.customer_id) return;

        const customerId = person.customerInfo.customer_id;
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 8000);

        const response = await fetch(
          `${BASE_URL}/api/get-existing-responses/${customerId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.existingResponses) {
            setExistingResponses(result.existingResponses);
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
          }
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error loading existing responses:", error);
        }
      }
    },
    [person, token, BASE_URL, individualResponses]
  );

  const calculateInterestAmount = useCallback(
    (item) => {
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

      const minimum_days_for_interest = rate == "24" ? 15 : 30;

      const result = calculateLoanInterest(
        principal,
        rate,
        startDate,
        endDate,
        minimum_days_for_interest
      );
      return result.interest;
    },
    [getDisplayValue]
  );

  const getCustomerName = useCallback(() => {
    if (person && person.customerInfo) {
      return (
        person.customerInfo.customer_name ||
        person.customerInfo.name ||
        "Customer"
      );
    }
    return "Customer";
  }, [person]);

  const getCustomerId = useCallback(() => {
    if (person && person.customerInfo) {
      return person.customerInfo.customer_id;
    }
    return null;
  }, [person]);

  const handleIndividualResponseChange = useCallback((ptNo, field, value) => {
    if (!ptNo) return;

    setIndividualResponses((prev) => ({
      ...prev,
      [ptNo]: {
        ...prev[ptNo],
        [field]: value,
      },
    }));
  }, []);

  // const openPreviousResponses = useCallback((ptNo) => {
  //   if (!ptNo) return;
  //   setSelectedPT(ptNo);
  //   setShowPTPreviousResponses(true);
  // }, []);

  const openPreviousResponses = useCallback(
    (ptNo) => {
      if (!ptNo || loadingPTPrevious) return;

      setLoadingPTPrevious(true);
      setSelectedPT(ptNo);
      setShowPTPreviousResponses(true);

      // Reset loading state after a short delay
      setTimeout(() => {
        setLoadingPTPrevious(false);
      }, 500);
    },
    [loadingPTPrevious]
  );

  const saveIndividualResponse = useCallback(
    async (ptNo) => {
      // Only allow updates if existing response exists
      const existingResponse = existingResponses[ptNo];
      if (!existingResponse) {
        Alert.alert(
          "Cannot Save",
          "No existing response found. Please capture the response in the detailed customer screen first."
        );
        return;
      }

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
        const customerId = getCustomerId();

        if (!customerId) {
          Alert.alert("Error", "Customer ID not found");
          return;
        }

        // Use existing image and location data (cannot be changed here)
        const imageUrl = existingResponse.image_url;
        const latitude = existingResponse.latitude;
        const longitude = existingResponse.longitude;

        const finalResponseDescription =
          responseData.response === "Others"
            ? responseData.description
            : responseData.description || "";

        const updateData = {
          customer_id: customerId,
          pt_no: ptNo,
          response_type: responseData.response,
          response_description: finalResponseDescription,
        };

        const controller = new AbortController();
        setTimeout(() => controller.abort(), 15000);

        const response = await fetch(
          `${BASE_URL}/api/save-individual-response`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setExistingResponses((prev) => ({
            ...prev,
            [ptNo]: {
              ...prev[ptNo],
              response_text: responseData.response,
              response_description: finalResponseDescription,
            },
          }));

          loadAllPreviousResponses(customerRecords);

          Alert.alert(
            "Success",
            `Response updated successfully for PT number: ${ptNo}!`,
            [{ text: "OK" }]
          );
        } else {
          throw new Error(result.message || "Failed to update response");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          Alert.alert("Error", "Failed to update response. Please try again.");
        }
      } finally {
        setSaving(false);
      }
    },
    [
      individualResponses,
      existingResponses,
      getCustomerId,
      token,
      BASE_URL,
      loadAllPreviousResponses,
      customerRecords,
    ]
  );

  const calculateBalance = useCallback(
    (item) => {
      if (!item) return "0.00";
      const amount = parseFloat(getDisplayValue(item, "loan_amount")) || 0;
      const paid = parseFloat(getDisplayValue(item, "paid_amount")) || 0;
      return (amount - paid).toFixed(2);
    },
    [getDisplayValue]
  );

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
      });
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < customerRecords.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
      });
    }
  }, [currentIndex, customerRecords.length]);

  const handleScroll = useCallback(
    (event) => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(contentOffsetX / width);
      if (
        newIndex !== currentIndex &&
        newIndex >= 0 &&
        newIndex < customerRecords.length
      ) {
        setCurrentIndex(newIndex);
      }
    },
    [currentIndex, customerRecords.length, width]
  );

  const handleMomentumScrollEnd = useCallback(
    (event) => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(contentOffsetX / width);
      if (
        newIndex !== currentIndex &&
        newIndex >= 0 &&
        newIndex < customerRecords.length
      ) {
        setCurrentIndex(newIndex);
      }
    },
    [currentIndex, customerRecords.length, width]
  );

  const renderCardItem = useCallback(
    ({ item, index }) => {
      if (!item) return null;

      const ptNo = getDisplayValue(item, "pt_no") || `Record ${index + 1}`;
      const currentResponse = individualResponses[ptNo] || {
        response: "",
        description: "",
      };
      const existingResponse = existingResponses[ptNo];
      const ptResponses = allPreviousResponses[ptNo] || [];

      return (
        <CardItem
          item={item}
          index={index}
          totalRecords={customerRecords.length}
          currentResponse={currentResponse}
          existingResponse={existingResponse}
          ptResponses={ptResponses}
          handleIndividualResponseChange={handleIndividualResponseChange}
          saveIndividualResponse={saveIndividualResponse}
          saving={saving}
          getDisplayValue={getDisplayValue}
          calculateBalance={calculateBalance}
          calculateInterestAmount={calculateInterestAmount}
          getDateOnly={getDateOnly}
          openPreviousResponses={openPreviousResponses}
        />
      );
    },
    [
      individualResponses,
      existingResponses,
      allPreviousResponses,
      customerRecords.length,
      handleIndividualResponseChange,
      saveIndividualResponse,
      saving,
      getDisplayValue,
      calculateBalance,
      calculateInterestAmount,
      getDateOnly,
      openPreviousResponses,
    ]
  );

  const safeCustomerId = getCustomerId();
  const safeCustomerName = getCustomerName();

  try {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
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

            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color="#ef4444" />
            </TouchableOpacity>
          </View>

          {/* <Text style={tw`text-center text-xs text-blue-600 mt-1`}>
          {Object.values(allPreviousResponses).reduce(
            (total, responses) => total + (responses ? responses.length : 0),
            0
          ) > 0
            ? `${Object.values(allPreviousResponses).reduce((total, responses) => total + (responses ? responses.length : 0), 0)} total responses across all PTs`
            : "No previous visit responses"}
        </Text> */}

          {/* Info banner about update-only mode */}
          <View
            style={tw`mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded`}
          >
            <Text style={tw`text-xs text-yellow-800 text-center`}>
              ℹ️ This screen only allows updating existing responses. New
              responses must be captured in the previous screen.
            </Text>
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
        {/* Main Content with Horizontal FlatList */}
        <View style={tw`flex-1`}>
          {customerRecords.length > 0 ? (
            <>
              {/* Navigation Buttons Row */}
              <View style={tw`flex-row justify-between items-center px-4 py-2`}>
                <TouchableOpacity
                  onPress={goToPrevious}
                  disabled={currentIndex === 0}
                  style={[
                    tw`px-4 py-3 rounded-full flex-row items-center`,
                    {
                      backgroundColor:
                        currentIndex === 0 ? "#e5e7eb" : "#3b82f6",
                      opacity: currentIndex === 0 ? 0.5 : 1,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={currentIndex === 0 ? "#9ca3af" : "white"}
                  />
                  <Text
                    style={[
                      tw`ml-2 font-bold`,
                      { color: currentIndex === 0 ? "#9ca3af" : "white" },
                    ]}
                  >
                    Previous
                  </Text>
                </TouchableOpacity>

                <Text style={tw`text-gray-600 font-medium`}>
                  {currentIndex + 1} / {customerRecords.length}
                </Text>

                <TouchableOpacity
                  onPress={goToNext}
                  disabled={currentIndex === customerRecords.length - 1}
                  style={[
                    tw`px-4 py-3 rounded-full flex-row items-center`,
                    {
                      backgroundColor:
                        currentIndex === customerRecords.length - 1
                          ? "#e5e7eb"
                          : "#3b82f6",
                      opacity:
                        currentIndex === customerRecords.length - 1 ? 0.5 : 1,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      tw`mr-2 font-bold`,
                      {
                        color:
                          currentIndex === customerRecords.length - 1
                            ? "#9ca3af"
                            : "white",
                      },
                    ]}
                  >
                    Next
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={
                      currentIndex === customerRecords.length - 1
                        ? "#9ca3af"
                        : "white"
                    }
                  />
                </TouchableOpacity>
              </View>

              {/* Horizontal FlatList for Cards */}
              <FlatList
                ref={flatListRef}
                data={customerRecords}
                renderItem={renderCardItem}
                keyExtractor={(item, index) => {
                  if (!item) return `null-item-${index}`;
                  const ptNo = item.pt_no;
                  return ptNo ? `card-${ptNo}-${index}` : `card-${index}`;
                }}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialNumToRender={1}
                maxToRenderPerBatch={1}
                windowSize={2}
                // removeClippedSubviews={Platform.OS === "android"}
                removeClippedSubviews={false}
                getItemLayout={(data, index) => ({
                  length: width,
                  offset: width * index,
                  index,
                })}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                decelerationRate="fast"
                snapToInterval={width}
                snapToAlignment="start"
                updateCellsBatchingPeriod={50}
                onScrollToIndexFailed={(info) => {
                  const wait = new Promise((resolve) =>
                    setTimeout(resolve, 500)
                  );
                  wait.then(() => {
                    flatListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: true,
                    });
                  });
                }}
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
        </View>
        {/* View All Responses Button */}
        <Pressable
          onPress={() => {
            if (!loadingPrevious) {
              setLoadingPrevious(true);
              setShowPreviousResponses(true);
              setTimeout(() => setLoadingPrevious(false), 500);
            }
          }}
          disabled={loadingPrevious}
          style={[
            tw`absolute bottom-4 self-center px-6 py-3 rounded-full shadow-lg`,
            {
              backgroundColor: loadingPrevious ? "#9ca3af" : "#3b82f6",
              elevation: 5,
            },
          ]}
          android_ripple={{ color: "#2563eb" }}
        >
          <Text style={tw`text-white text-lg font-bold`}>
            {loadingPrevious ? "Loading..." : "View All Responses"}
          </Text>
        </Pressable>

        {/* Previous Responses Modal */}
        {showPreviousResponses &&
          PreviousResponsesListComponent &&
          safeCustomerId &&
          token &&
          BASE_URL && (
            <PreviousResponsesListComponent
              visible={showPreviousResponses}
              onClose={() => setShowPreviousResponses(false)}
              customerId={safeCustomerId}
              token={token}
              BASE_URL={BASE_URL}
              customerName={safeCustomerName}
            />
          )}
        {/* PT Previous Responses Modal */}
        {showPTPreviousResponses &&
          PTPreviousResponsesComponent &&
          safeCustomerId &&
          selectedPT &&
          token &&
          BASE_URL && (
            <PTPreviousResponsesComponent
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
          )}
      </SafeAreaView>
    );
  } catch (error) {
    console.error("CustRelated render error:", error);
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-white`}>
        <Text style={tw`text-red-500`}>Error loading component</Text>
        <TouchableOpacity onPress={onClose} style={tw`mt-4`}>
          <Text style={tw`text-blue-500`}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
};
// console.log(`showPTPreviousResponses :- ${showPTPreviousResponses}, safeCustomerId :- ${safeCustomerId}, selectedPT :- ${selectedPT}, safeCustomerName :- ${safeCustomerName}, token :- ${token}`)

const InfoRow = React.memo(({ label, value }) => {
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
});

export default CustRelated;

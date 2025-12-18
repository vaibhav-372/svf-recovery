import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";
import ErrorBoundary from "./ErrorBoundary";

const { width, height } = Dimensions.get("window");

const PTPreviousResponses = ({
  visible,
  onClose,
  customerId,
  ptNo,
  token,
  BASE_URL,
  customerName,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [previousResponses, setPreviousResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [imageError, setImageError] = useState({});
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const flatListRef = useRef(null);
  const lastLoadTimeRef = useRef(0);

  const hasRequiredParams = useMemo(() => {
    const isValidVisible = typeof visible === "boolean";
    const isValidCustomerId =
      customerId &&
      typeof customerId === "string" &&
      customerId?.trim()?.length > 0;
    const isValidPtNo =
      ptNo && typeof ptNo === "string" && ptNo?.trim()?.length > 0;
    const isValidToken =
      token && typeof token === "string" && token?.trim()?.length > 0;
    const isValidBaseUrl =
      BASE_URL && typeof BASE_URL === "string" && BASE_URL?.trim()?.length > 0;

    return (
      isValidVisible &&
      visible &&
      isValidCustomerId &&
      isValidPtNo &&
      isValidToken &&
      isValidBaseUrl
    );
  }, [visible, customerId, ptNo, token, BASE_URL]);

  useEffect(() => {
    setIsMounted(true);

    return () => {
      setIsMounted(false);
      // Clean up all state
      setPreviousResponses([]);
      setSelectedResponse(null);
      setImageError({});
      setHasError(false);
      setRetryCount(0);
    };
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (hasRequiredParams) {
      // Prevent rapid reloading - wait at least 1 second between loads
      const now = Date.now();
      if (now - lastLoadTimeRef.current > 1000) {
        loadPreviousResponses();
        lastLoadTimeRef.current = now;
      }
    } else {
      // Reset states when modal closes or params are invalid
      if (isMounted) {
        setPreviousResponses([]);
        setSelectedResponse(null);
        setImageError({});
        setHasError(false);
      }
    }

    return () => {
      // Clean up any pending operations
      if (isMounted) {
        setLoading(false);
      }
    };
  }, [hasRequiredParams, isMounted, retryCount]);

  const loadPreviousResponses = async () => {
    if (!isMounted) return;

    try {
      // Validate parameters again before making request
      if (!hasRequiredParams) {
        console.error("Missing required parameters for PT responses:", {
          customerId,
          ptNo,
          tokenLength: token ? token.length : 0,
          BASE_URL,
          visible,
        });

        if (isMounted) {
          setHasError(true);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setHasError(false);
      }

      // Validate URL construction
      const apiUrl = `${BASE_URL}/api/get-previous-responses-by-pt/${encodeURIComponent(customerId)}/${encodeURIComponent(ptNo)}`;

      if (!apiUrl || !apiUrl?.startsWith("http")) {
        throw new Error("Invalid API URL constructed");
      }

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error ${response?.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response?.status}`);
      }

      const result = await response?.json();

      if (!isMounted) return;

      // Safely handle API response with type checking
      if (result && typeof result === "object" && result?.success) {
        const responses = result?.previousResponses;

        if (Array.isArray(responses)) {
          // Filter out null/undefined and ensure each item is an object
          const validResponses = responses?.filter(
            (item) => item && typeof item === "object" && item?.entry_id
          );

          setPreviousResponses(validResponses);
        } else {
          setPreviousResponses([]);
          console.log(
            "API response.previousResponses is not an array:",
            responses
          );
        }
      } else {
        setPreviousResponses([]);
        console.log("API returned unsuccessful:", result);
      }
    } catch (error) {
      console.error("Error loading previous responses:", error);

      if (isMounted) {
        setHasError(true);
        setPreviousResponses([]);

        // Only show alert if it's not an abort/timeout error
        if (error.name !== "AbortError" && error.name !== "TimeoutError") {
          if (retryCount < 2) {
            Alert.alert(
              "Connection Issue",
              "Having trouble loading responses. Would you like to try again?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Retry",
                  onPress: () => {
                    if (isMounted) {
                      setRetryCount((prev) => prev + 1);
                    }
                  },
                },
              ]
            );
          } else {
            Alert.alert(
              "Error",
              "Failed to load previous visits. Please check your connection and try again."
            );
          }
        }
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";

    try {
      const safeString =
        typeof dateString === "string" ? dateString : String(dateString);

      // Handle common date formats
      let date = new Date(safeString);

      // Check if date is valid
      if (isNaN(date?.getTime())) {
        // Try parsing as ISO string
        const isoDate = new Date(safeString?.replace(" ", "T"));
        if (isNaN(isoDate?.getTime())) {
          return "Invalid date";
        }
        date = isoDate;
      }

      return date?.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  const handleResponsePress = (response) => {
    if (!isMounted) return;

    if (!response || typeof response !== "object") {
      console.warn("Attempted to press invalid response:", response);
      return;
    }

    setSelectedResponse(response);
    setDetailModalVisible(true);
  };

  const getSafeImageUrl = (imageUrl) => {
    if (
      !imageUrl ||
      typeof imageUrl !== "string" ||
      imageUrl?.trim()?.length === 0
    ) {
      return null;
    }

    try {
      // Clean up the URL
      const cleanUrl = imageUrl?.trim();

      // Handle both absolute and relative URLs
      if (cleanUrl?.startsWith("http://") || cleanUrl?.startsWith("https://")) {
        return cleanUrl;
      } else if (cleanUrl?.startsWith("/")) {
        return `${BASE_URL}${cleanUrl}`;
      } else {
        return `${BASE_URL}/${cleanUrl}`;
      }
    } catch (error) {
      console.error("Error constructing image URL:", error);
      return null;
    }
  };

  const handleImageError = (responseId) => {
    if (!isMounted) return;

    setImageError((prev) => ({
      ...prev,
      [responseId]: true,
    }));
  };

  const getTruncatedDescription = (description) => {
    if (!description || typeof description !== "string") {
      return "Other";
    }

    const trimmed = description?.trim();
    if (trimmed?.length === 0) return "Other";

    if (trimmed?.length <= 30) {
      return trimmed;
    }

    return trimmed?.substring(0, 30) + "...";
  };

  const renderResponseItem = ({ item, index }) => {
    // Safety check for null item
    if (!item || typeof item !== "object") {
      return (
        <View style={tw`p-4 border-b border-gray-200 bg-red-50`}>
          <Text style={tw`text-red-500 text-sm`}>Invalid response data</Text>
        </View>
      );
    }

    const safeItem = item;
    const responseId = safeItem?.entry_id || `index-${index}`;

    try {
      return (
        <TouchableOpacity
          style={[
            tw`p-4 border-b border-gray-200`,
            safeItem?.is_current_agent && tw`bg-blue-50`,
          ]}
          onPress={() => handleResponsePress(safeItem)}
          activeOpacity={0.7}
        >
          <View style={tw`flex-row items-center`}>
            <View style={tw`flex-1`}>
              <View style={tw`flex-row justify-between items-start mb-1`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`font-bold text-gray-800 text-base`}>
                    {safeItem?.agent_name ||
                      safeItem?.agent_full_name ||
                      "Unknown Agent"}
                    {safeItem?.is_current_agent && (
                      <Text style={tw`text-blue-600 text-xs`}> (You)</Text>
                    )}
                  </Text>
                </View>
                <View style={tw`items-end`}>
                  <Text style={tw`text-xs text-gray-500`}>
                    {formatDate(safeItem?.response_timestamp)}
                  </Text>
                </View>
              </View>

              <View style={tw`flex-row justify-between items-center mt-1`}>
                <Text
                  style={[
                    tw`text-sm font-medium flex-1`,
                    safeItem?.response_text === "Others"
                      ? tw`text-purple-600`
                      : tw`text-green-600`,
                  ]}
                  numberOfLines={1}
                >
                  {safeItem?.response_text === "Others"
                    ? getTruncatedDescription(safeItem?.response_description)
                    : safeItem?.response_text || "No response"}
                </Text>

                {safeItem?.image_url && (
                  <Ionicons name="camera" size={16} color="#6b7280" />
                )}
              </View>
            </View>

            <View style={tw`ml-3`}>
              <Ionicons name="chevron-forward" size={20} color="#7cc0d8" />
            </View>
          </View>
        </TouchableOpacity>
      );
    } catch (error) {
      console.error("Error rendering response item:", error);
      return (
        <View style={tw`p-4 border-b border-gray-200 bg-yellow-50`}>
          <Text style={tw`text-yellow-700 text-sm`}>
            Error displaying response
          </Text>
        </View>
      );
    }
  };

  const renderDetailModal = () => {
    if (!selectedResponse || typeof selectedResponse !== "object") {
      return null;
    }

    const safeResponse = selectedResponse;
    const responseId = safeResponse?.entry_id || "detail";
    const imageUrl = getSafeImageUrl(safeResponse?.image_url);
    const hasImage = imageUrl && !imageError[responseId];

    return (
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={() => {
          if (isMounted) {
            setDetailModalVisible(false);
          }
        }}
      >
        <View style={tw`flex-1 bg-white`}>
          {/* Header */}
          <View
            style={tw`px-4 py-3 border-b border-gray-200 flex-row justify-between items-center`}
          >
            <Text style={tw`text-lg font-bold text-gray-800`}>
              Response Details
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (isMounted) {
                  setDetailModalVisible(false);
                }
              }}
              style={tw`p-2`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#4b5563" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={tw`flex-1 p-4`}
            showsVerticalScrollIndicator={false}
          >
            {/* Agent Info */}
            <View
              style={tw`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4`}
            >
              <Text style={tw`font-bold text-blue-800 text-lg`}>
                {safeResponse?.agent_name ||
                  safeResponse?.agent_full_name ||
                  "Unknown Agent"}
                {safeResponse?.is_current_agent && (
                  <Text style={tw`text-blue-600`}> (You)</Text>
                )}
              </Text>
              <Text style={tw`text-blue-700 text-sm mt-1`}>
                PT: {safeResponse?.pt_no || "N/A"}
              </Text>
            </View>

            {/* Visit Date */}
            <View style={tw`mb-4`}>
              <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
                Visit Date & Time:
              </Text>
              <Text style={tw`text-gray-600`}>
                {formatDate(safeResponse?.response_timestamp)}
              </Text>
            </View>

            {/* Response */}
            <View style={tw`mb-4`}>
              <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
                Response:
              </Text>
              <View
                style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3`}
              >
                <Text style={tw`text-gray-800 font-medium`}>
                  {safeResponse?.response_text || "No response recorded"}
                </Text>
              </View>
            </View>

            {/* Description */}
            {safeResponse?.response_description && (
              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
                  Description:
                </Text>
                <View
                  style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3`}
                >
                  <Text style={tw`text-gray-800`}>
                    {safeResponse?.response_description}
                  </Text>
                </View>
              </View>
            )}

            {/* Image */}
            {hasImage && (
              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>
                  Visit Image:
                </Text>
                <View
                  style={tw`border border-gray-200 rounded-lg overflow-hidden bg-gray-100`}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={{
                      width: width - 32,
                      height: 300,
                      resizeMode: "contain",
                    }}
                    onError={() => handleImageError(responseId)}
                  />
                </View>
              </View>
            )}

            {/* Show image error state */}
            {safeResponse?.image_url && !hasImage && (
              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>
                  Visit Image:
                </Text>
                <View
                  style={[
                    tw`justify-center items-center border border-gray-200 rounded-lg`,
                    { width: width - 32, height: 300 },
                  ]}
                >
                  <Ionicons name="image-outline" size={50} color="#9ca3af" />
                  <Text style={tw`text-gray-500 mt-2`}>
                    Image not available
                  </Text>
                </View>
              </View>
            )}

            {/* Location */}
            {safeResponse?.latitude && safeResponse?.longitude && (
              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
                  Location:
                </Text>
                <Text style={tw`text-gray-600 text-sm`}>
                  Latitude: {safeResponse?.latitude}, Longitude:{" "}
                  {safeResponse?.longitude}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Close Button */}
          <View style={tw`p-4 border-t border-gray-200`}>
            <Pressable
              onPress={() => {
                if (isMounted) {
                  setDetailModalVisible(false);
                }
              }}
              style={[
                tw`rounded-full px-6 py-3`,
                { backgroundColor: "#7cc0d8" },
              ]}
            >
              <Text style={tw`text-white text-lg font-bold text-center`}>
                Close Details
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  // Safety check for main modal - don't render if not visible
  if (!visible || !isMounted) return null;

  const safeCustomerName = customerName || "Customer";
  const safePtNo = ptNo || "N/A";

  return (
    <ErrorBoundary fallbackMessage="Unable to load PT responses" showRetry>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={tw`flex-1 bg-white`}>
          {/* Header */}
          <View
            style={tw`px-4 py-3 border-b border-gray-200 flex-row justify-between items-center`}
          >
            <View style={tw`flex-1`}>
              <Text style={tw`text-lg font-bold text-gray-800`}>
                Previous Visits
              </Text>
              <Text style={tw`text-sm text-gray-600`} numberOfLines={1}>
                {safeCustomerName} - PT: {safePtNo}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={tw`p-2`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={tw`px-4 py-3 bg-gray-50 border-b border-gray-200`}>
            <Text style={tw`text-sm text-gray-700`}>
              {hasError
                ? "Error loading visits"
                : `${previousResponses?.length || 0} previous visit${previousResponses?.length !== 1 ? "s" : ""} for this PT number`}
            </Text>
          </View>

          {/* Loading State */}
          {loading ? (
            <View style={tw`flex-1 justify-center items-center`}>
              <ActivityIndicator size="large" color="#7cc0d8" />
              <Text style={tw`text-gray-600 mt-2`}>
                Loading previous visits...
              </Text>
            </View>
          ) : hasError ? (
            <View style={tw`flex-1 justify-center items-center p-4`}>
              <Ionicons name="alert-circle-outline" size={50} color="#ef4444" />
              <Text style={tw`text-lg text-red-500 text-center mt-2`}>
                Failed to load visits
              </Text>
              <Text style={tw`text-sm text-gray-400 text-center mt-1 mb-4`}>
                Please check your connection and try again
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (isMounted) {
                    setRetryCount((prev) => prev + 1);
                    setHasError(false);
                  }
                }}
                style={tw`bg-blue-500 px-6 py-3 rounded-full`}
              >
                <Text style={tw`text-white font-bold`}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : previousResponses?.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={previousResponses}
              renderItem={renderResponseItem}
              keyExtractor={(item, index) => {
                // Safe key extraction with validation
                if (!item || typeof item !== "object") {
                  return `null-item-${index}-${Date.now()}`;
                }

                const entryId = item?.entry_id;
                const responseId = item?.response_id;

                if (entryId) {
                  return `response-${entryId}-${index}`;
                } else if (responseId) {
                  return `response-${responseId}-${index}`;
                } else {
                  return `response-${index}-${Date.now()}`;
                }
              }}
              showsVerticalScrollIndicator={false}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={3}
              removeClippedSubviews={false}
              updateCellsBatchingPeriod={50}
            />
          ) : (
            <View style={tw`flex-1 justify-center items-center p-4`}>
              <Ionicons name="time-outline" size={50} color="#9ca3af" />
              <Text style={tw`text-lg text-gray-500 text-center mt-2`}>
                No previous visits for this PT
              </Text>
              <Text style={tw`text-sm text-gray-400 text-center mt-1`}>
                Visit responses will appear here after they are saved
              </Text>
            </View>
          )}

          {/* Detail Modal */}
          {renderDetailModal()}

          {/* Close Button */}
          <View style={tw`p-4 border-t border-gray-200`}>
            <Pressable
              onPress={onClose}
              style={[
                tw`rounded-full px-6 py-3`,
                { backgroundColor: "#7cc0d8" },
              ]}
            >
              <Text style={tw`text-white text-lg font-bold text-center`}>
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ErrorBoundary>
  );
};

export default PTPreviousResponses;

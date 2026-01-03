import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  Image,
} from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";
import ErrorBoundary from "./ErrorBoundary";

const { width, height } = Dimensions.get("window");

const PreviousResponsesList = React.memo(
  ({ visible, onClose, customerId, token, BASE_URL, customerName }) => {
    const [previousResponses, setPreviousResponses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedResponse, setSelectedResponse] = useState(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [imageError, setImageError] = useState({});
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [imageViewVisible, setImageViewVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const lastLoadTimeRef = useRef(0);
    const flatListRef = useRef(null);
    const isMounted = useRef(true);

    const hasRequiredParams = useMemo(() => {
      const isValidVisible = typeof visible === "boolean";
      const isValidCustomerId =
        customerId &&
        typeof customerId === "string" &&
        customerId.trim().length > 0;
      const isValidToken =
        token && typeof token === "string" && token.trim().length > 0;
      const isValidBaseUrl =
        BASE_URL && typeof BASE_URL === "string" && BASE_URL.trim().length > 0;

      return (
        isValidVisible &&
        visible &&
        isValidCustomerId &&
        isValidToken &&
        isValidBaseUrl
      );
    }, [visible, customerId, token, BASE_URL]);

    useEffect(() => {
      isMounted.current = true;

      return () => {
        isMounted.current = false;
        // Clean up all state
        setPreviousResponses([]);
        setSelectedResponse(null);
        setImageError({});
        setHasError(false);
        setRetryCount(0);
        setRefreshing(false);
      };
    }, []);

    useEffect(() => {
      if (!isMounted.current) return; // FIXED: Use .current

      if (hasRequiredParams) {
        const now = Date.now();
        if (now - lastLoadTimeRef.current > 1000) {
          loadPreviousResponses();
          lastLoadTimeRef.current = now;
        }
      } else {
        // Reset states when modal closes
        if (isMounted.current) { // FIXED: Use .current
          setPreviousResponses([]);
          setSelectedResponse(null);
          setImageError({});
          setHasError(false);
        }
      }

      return () => {
        if (isMounted.current) { // FIXED: Use .current
          setLoading(false);
          setRefreshing(false);
        }
      };
    }, [hasRequiredParams, retryCount]); // FIXED: Remove isMounted from deps

    const loadPreviousResponses = async () => {
      if (!isMounted.current) return; // FIXED: Use .current

      try {
        if (!hasRequiredParams) {
          console.error("Missing required parameters for previous responses:", {
            customerId,
            tokenLength: token ? token.length : 0,
            BASE_URL,
            visible,
          });

          if (isMounted.current) { // FIXED: Use .current
            setHasError(true);
          }
          return;
        }

        if (isMounted.current) { // FIXED: Use .current
          setLoading(true);
          setHasError(false);
        }

        const apiUrl = `${BASE_URL}/api/get-all-previous-responses/${encodeURIComponent(customerId)}`;

        if (!apiUrl || !apiUrl.startsWith("http")) {
          throw new Error("Invalid API URL constructed");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP error ${response.status}:`, errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("all previous responses", result);

        if (!isMounted.current) return; // FIXED: Use .current

        if (result && typeof result === "object" && result.success) {
          const responses = result.previousResponses;

          if (Array.isArray(responses)) {
            const validResponses = responses.filter(
              (item) => item && typeof item === "object" && item.entry_id
            );

            if (isMounted.current) { // FIXED: Use .current
              setPreviousResponses(validResponses);
            }
          } else {
            if (isMounted.current) { // FIXED: Use .current
              setPreviousResponses([]);
            }
            console.log(
              "API response.previousResponses is not an array:",
              responses
            );
          }
        } else {
          if (isMounted.current) { // FIXED: Use .current
            setPreviousResponses([]);
          }
          console.log("API returned unsuccessful:", result);
        }
      } catch (error) {
        console.error("Error loading previous responses:", error);

        if (isMounted.current) { // FIXED: Use .current
          setHasError(true);
          setPreviousResponses([]);

          if (error.name !== "AbortError") {
            if (retryCount < 2) {
              Alert.alert(
                "Connection Issue",
                "Having trouble loading responses. Would you like to try again?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Retry",
                    onPress: () => {
                      if (isMounted.current) { // FIXED: Use .current
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
        if (isMounted.current) { // FIXED: Use .current
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    const handleRefresh = () => {
      if (!isMounted.current || refreshing) return; // FIXED: Use .current

      setRefreshing(true);
      setRetryCount(0);
      loadPreviousResponses();
    };

    const formatDate = (dateString) => {
      if (!dateString) return "Unknown date";

      try {
        const safeString =
          typeof dateString === "string" ? dateString : String(dateString);

        let date = new Date(safeString);

        if (isNaN(date.getTime())) {
          const isoDate = new Date(safeString.replace(" ", "T"));
          if (isNaN(isoDate.getTime())) {
            return "Invalid date";
          }
          date = isoDate;
        }

        return date.toLocaleDateString("en-US", {
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
      if (!isMounted.current) return; // FIXED: Use .current

      if (!response || typeof response !== "object") {
        console.warn("Attempted to press invalid response:", response);
        return;
      }

      setSelectedResponse(response);
      setDetailModalVisible(true);
    };

    const getSafeImageUrl = useCallback(
      (imageUrl) => {
        if (
          !imageUrl ||
          typeof imageUrl !== "string" ||
          imageUrl.trim().length === 0
        ) {
          return null;
        }

        try {
          const cleanUrl = imageUrl.trim();

          if (!BASE_URL) return cleanUrl;

          if (
            cleanUrl.startsWith("http://") ||
            cleanUrl.startsWith("https://")
          ) {
            return cleanUrl;
          } else if (cleanUrl.startsWith("/")) {
            return `${BASE_URL}${cleanUrl}`;
          } else {
            return `${BASE_URL}/${cleanUrl}`;
          }
        } catch (error) {
          console.error("Error constructing image URL:", error);
          return null;
        }
      },
      [BASE_URL]
    );

    const handleImageError = useCallback((responseId) => {
      console.log("Image failed to load for response:", responseId);

      if (isMounted.current) { // FIXED: Use .current
        setImageError((prev) => ({
          ...prev,
          [responseId]: true,
        }));
      }
    }, []);

    const handleViewImage = (imageUrl) => {
      if (!imageUrl) return;

      const safeImageUrl = getSafeImageUrl(imageUrl);
      if (safeImageUrl && isMounted.current) { // FIXED: Use .current
        setCurrentImageIndex(0);
        setImageViewVisible(true);
      }
    };

    const getImagesForViewing = () => {
      if (!selectedResponse?.image_url) return [];

      const safeImageUrl = getSafeImageUrl(selectedResponse.image_url);
      return safeImageUrl ? [{ uri: safeImageUrl }] : [];
    };

    const renderResponseItem = ({ item, index }) => {
      if (!item || typeof item !== "object") {
        return (
          <View style={tw`p-4 border-b border-gray-200 bg-yellow-50`}>
            <Text style={tw`text-yellow-600 text-sm`}>
              Invalid response data at index {index}
            </Text>
          </View>
        );
      }

      const safeItem = item;

      try {
        const isCurrentAgent = safeItem.is_current_agent === true;
        const responseText = safeItem.response_text || "No response";
        const isOthersResponse = responseText === "Others";

        let displayText = responseText;
        if (isOthersResponse) {
          const description = safeItem.response_description || "";
          displayText =
            description.length > 30
              ? description.substring(0, 30) + "..."
              : description || "Other";
        }

        const agentName =
          safeItem.agent_name || safeItem.agent_full_name || "Unknown Agent";
        const ptNo = safeItem.pt_no || "N/A";

        return (
          <TouchableOpacity
            style={[
              tw`p-4 border-b border-gray-200`,
              isCurrentAgent && tw`bg-blue-50`,
            ]}
            onPress={() => handleResponsePress(safeItem)}
            activeOpacity={0.7}
          >
            <View style={tw`flex-row justify-between items-start mb-2`}>
              <View style={tw`flex-1`}>
                <Text style={tw`font-bold text-gray-800`}>
                  {agentName}
                  {isCurrentAgent && (
                    <Text style={tw`text-blue-600 text-xs`}> (You)</Text>
                  )}
                </Text>
                <Text style={tw`text-sm text-gray-600 mt-1`}>PT: {ptNo}</Text>
                <Text
                  style={[
                    tw`text-sm font-medium mt-1`,
                    isOthersResponse ? tw`text-purple-600` : tw`text-green-600`,
                  ]}
                  numberOfLines={1}
                >
                  {displayText}
                </Text>
              </View>
              <View style={tw`items-end`}>
                <Text style={tw`text-xs text-gray-500`}>
                  {formatDate(safeItem.response_timestamp)}
                </Text>
                {safeItem.image_url && (
                  <Ionicons
                    name="camera"
                    size={16}
                    color="#6b7280"
                    style={tw`mt-1`}
                  />
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      } catch (renderError) {
        console.error("Error rendering response item:", renderError);
        return (
          <View style={tw`p-4 border-b border-gray-200 bg-red-50`}>
            <Text style={tw`text-red-500 text-sm`}>
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
      const responseId = safeResponse.entry_id || "detail";
      const imageUrl = getSafeImageUrl(safeResponse.image_url);
      const hasImage = imageUrl && !imageError[responseId];

      return (
        <Modal
          visible={detailModalVisible}
          animationType="slide"
          onRequestClose={() => {
            if (isMounted.current) { // FIXED: Use .current
              setDetailModalVisible(false);
            }
          }}
        >
          <View style={tw`flex-1 bg-white`}>
            <View
              style={tw`px-4 py-3 border-b border-gray-200 flex-row justify-between items-center`}
            >
              <Text style={tw`text-lg font-bold text-gray-800`}>
                Response Details
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (isMounted.current) { // FIXED: Use .current
                    setDetailModalVisible(false);
                  }
                }}
                style={tw`p-2`}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {safeResponse ? (
              <ScrollView
                style={tw`flex-1 p-4`}
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={tw`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4`}
                >
                  <Text style={tw`font-bold text-blue-800 text-lg`}>
                    {safeResponse.agent_name ||
                      safeResponse.agent_full_name ||
                      "Unknown Agent"}
                    {safeResponse.is_current_agent && (
                      <Text style={tw`text-blue-600`}> (You)</Text>
                    )}
                  </Text>
                  <Text style={tw`text-blue-700 text-sm mt-1`}>
                    PT: {safeResponse.pt_no || "N/A"}
                  </Text>
                </View>

                <View style={tw`mb-4`}>
                  <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
                    Visit Date & Time:
                  </Text>
                  <Text style={tw`text-gray-600`}>
                    {formatDate(safeResponse.response_timestamp)}
                  </Text>
                </View>

                <View style={tw`mb-4`}>
                  <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
                    Response:
                  </Text>
                  <View
                    style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3`}
                  >
                    <Text style={tw`text-gray-800 font-medium`}>
                      {safeResponse.response_text || "No response recorded"}
                    </Text>
                  </View>
                </View>

                {safeResponse.response_description && (
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
                      Description:
                    </Text>
                    <View
                      style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3`}
                    >
                      <Text style={tw`text-gray-800`}>
                        {safeResponse.response_description}
                      </Text>
                    </View>
                  </View>
                )}

                {hasImage && (
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>
                      Visit Image:
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleViewImage(safeResponse.image_url)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={tw`border border-gray-200 rounded-lg overflow-hidden bg-gray-100`}
                      >
                        <Image
                          source={{ uri: imageUrl }}
                          style={{
                            width: width - 32,
                            height: 300,
                          }}
                          resizeMode="contain"
                          fadeDuration={300}
                          progressiveRenderingEnabled={true}
                          onError={() => handleImageError(responseId)}
                        />
                      </View>
                      <Text style={tw`text-center text-blue-500 text-xs mt-1`}>
                        Tap to view full image
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {safeResponse.image_url && !hasImage && (
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
                      <Ionicons
                        name="image-outline"
                        size={50}
                        color="#9ca3af"
                      />
                      <Text style={tw`text-gray-500 mt-2`}>
                        Image not available
                      </Text>
                    </View>
                  </View>
                )}

                {safeResponse.latitude && safeResponse.longitude && (
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
                      Location:
                    </Text>
                    <Text style={tw`text-gray-600 text-sm`}>
                      Latitude: {safeResponse.latitude}, Longitude:{" "}
                      {safeResponse.longitude}
                    </Text>
                  </View>
                )}

                <View
                  style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3`}
                >
                  <Text style={tw`text-xs text-gray-600 text-center`}>
                    Recorded via {safeResponse.device_id || "Mobile App"}
                  </Text>
                </View>
              </ScrollView>
            ) : (
              <View style={tw`flex-1 justify-center items-center`}>
                <Text style={tw`text-gray-500`}>
                  No response data available
                </Text>
              </View>
            )}

            <View style={tw`p-4 border-t border-gray-200`}>
              <Pressable
                onPress={() => {
                  if (isMounted.current) { // FIXED: Use .current
                    setDetailModalVisible(false);
                  }
                }}
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
      );
    };

    // Safety check for main modal - FIXED this line
    if (!visible) return null; 

    const safeCustomerName = customerName || "Customer";

    return (
      <ErrorBoundary
        fallbackMessage="Unable to load previous responses"
        showRetry
      >
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
          <View style={tw`flex-1 bg-white`}>
            <View
              style={tw`px-4 py-3 border-b border-gray-200 flex-row justify-between items-center`}
            >
              <View style={tw`flex-1`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>
                  Previous Visits
                </Text>
                <Text style={tw`text-sm text-gray-600`} numberOfLines={1}>
                  {safeCustomerName}
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

            <View style={tw`px-4 py-3 bg-gray-50 border-b border-gray-200`}>
              <Text style={tw`text-sm text-gray-700`}>
                {hasError
                  ? "Error loading visits"
                  : `Total ${previousResponses.length} visit${previousResponses.length !== 1 ? "s" : ""} recorded`}
              </Text>
            </View>

            {loading ? (
              <View style={tw`flex-1 justify-center items-center`}>
                <ActivityIndicator size="large" color="#7cc0d8" />
                <Text style={tw`text-gray-600 mt-2`}>
                  Loading previous visits...
                </Text>
              </View>
            ) : hasError ? (
              <View style={tw`flex-1 justify-center items-center p-4`}>
                <Ionicons
                  name="alert-circle-outline"
                  size={50}
                  color="#ef4444"
                />
                <Text style={tw`text-lg text-red-500 text-center mt-2`}>
                  Failed to load visits
                </Text>
                <Text style={tw`text-sm text-gray-400 text-center mt-1 mb-4`}>
                  Please check your connection and try again
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (isMounted.current) { // FIXED: Use .current
                      setRetryCount((prev) => prev + 1);
                      setHasError(false);
                    }
                  }}
                  style={tw`bg-blue-500 px-6 py-3 rounded-full`}
                >
                  <Text style={tw`text-white font-bold`}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : previousResponses.length > 0 ? (
              <FlatList
                ref={flatListRef}
                data={previousResponses}
                renderItem={renderResponseItem}
                keyExtractor={(item, index) => {
                  if (!item || typeof item !== "object") {
                    return `null-item-${index}`;
                  }
                  const entryId = item.entry_id;
                  const responseId = item.response_id;
                  return entryId
                    ? `response-${entryId}`
                    : responseId
                      ? `response-${responseId}`
                      : `response-${index}`;
                }}
                getItemLayout={(data, index) => ({
                  length: 80,
                  offset: 80 * index,
                  index,
                })}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={11}
                removeClippedSubviews={Platform.OS === "android"}
                updateCellsBatchingPeriod={100}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                legacyImplementation={false}
                extraData={selectedResponse}
              />
            ) : (
              <View style={tw`flex-1 justify-center items-center p-4`}>
                <Ionicons name="time-outline" size={50} color="#9ca3af" />
                <Text style={tw`text-lg text-gray-500 text-center mt-2`}>
                  No previous visits found
                </Text>
                <Text style={tw`text-sm text-gray-400 text-center mt-1`}>
                  Visit responses will appear here after they are saved
                </Text>
              </View>
            )}

            {renderDetailModal()}
          </View>
        </Modal>

        <ImageViewing
          images={getImagesForViewing()}
          imageIndex={currentImageIndex}
          visible={imageViewVisible}
          onRequestClose={() => {
            if (isMounted.current) { // FIXED: Use .current
              setImageViewVisible(false);
            }
          }}
          FooterComponent={({ imageIndex }) => (
            <View style={tw`p-4 bg-black bg-opacity-50`}>
              <Text style={tw`text-white text-center`}>
                {imageIndex + 1} / {getImagesForViewing().length}
              </Text>
            </View>
          )}
        />
      </ErrorBoundary>
    );
  }
);

export default PreviousResponsesList;
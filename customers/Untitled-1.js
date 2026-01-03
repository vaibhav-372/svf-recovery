// console.log("running........")
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";

const { width, height } = Dimensions.get("window");

const PTPreviousResponses = React.memo(
  ({ visible, onClose, customerId, ptNo, token, BASE_URL, customerName }) => {
    const [previousResponses, setPreviousResponses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedResponse, setSelectedResponse] = useState(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [imageError, setImageError] = useState({});

    const isMounted = useRef(true);
    const abortControllerRef = useRef(null);

    useEffect(() => {
      if (visible && customerId && ptNo) {
        loadPreviousResponses();
      } else {
        // Reset states when modal closes
        setPreviousResponses([]);
        setSelectedResponse(null);
        setImageError({}); // Reset to empty object
      }

      return () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }, [visible, customerId, ptNo]);

    useEffect(() => {
      console.log("PTPreviousResponses mounted", { visible, customerId, ptNo });
      isMounted.current = true;

      // Cleanup function
      return () => {
        console.log("PTPreviousResponses unmounted");
        isMounted.current = false;

        // Abort any ongoing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Reset all state synchronously
        setPreviousResponses([]);
        setSelectedResponse(null);
        setImageError({}); // Reset to empty object
        setLoading(false);
      };
    }, []);

    const loadPreviousResponses = useCallback(async () => {
      try {
        // Validate required parameters
        if (!customerId || !ptNo || !token || !BASE_URL) {
          console.error("Missing required parameters:", {
            customerId,
            ptNo,
            hasToken: !!token,
            hasBaseUrl: !!BASE_URL,
          });
          if (isMounted.current) {
            Alert.alert(
              "Error",
              "Missing required information to load responses"
            );
          }
          return;
        }

        // Abort any ongoing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        if (isMounted.current) {
          setLoading(true);
        }

        const response = await fetch(
          `${BASE_URL}/api/get-previous-responses-by-pt/${customerId}/${ptNo}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        // console.log("pt previous response of", result);

        // Check if component is still mounted
        if (!isMounted.current) return;

        // Safely handle API response
        if (result && result.success) {
          const responses = result.previousResponses;

          // Filter out null/undefined items
          const validResponses = Array.isArray(responses)
            ? responses.filter((item) => item && typeof item === "object")
            : [];

          if (isMounted.current) {
            setPreviousResponses(validResponses);
          }
        } else {
          if (isMounted.current) {
            setPreviousResponses([]);
          }
        }
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("Request was aborted");
          return;
        }

        console.error("Error loading previous responses:", error);
        if (isMounted.current) {
          Alert.alert(
            "Error",
            "Failed to load previous visits for this PT number"
          );
          setPreviousResponses([]);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    }, [customerId, ptNo, token, BASE_URL]);

    const formatDate = useCallback((dateString) => {
      if (!dateString) return "Unknown date";
      try {
        const date = new Date(dateString);
        return isNaN(date.getTime())
          ? "Invalid date"
          : date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
      } catch (error) {
        return "Invalid date";
      }
    }, []);

    const handleResponsePress = useCallback((response) => {
      if (!response) {
        console.warn("Attempted to press null response");
        return;
      }

      setSelectedResponse(response);
      setDetailModalVisible(true);
    }, []);

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

          // Handle null BASE_URL
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

      if (isMounted.current) {
        setImageError((prev) => ({
          ...prev,
          [responseId]: true,
        }));
      }
    }, []);

    const getTruncatedDescription = useCallback((description) => {
      if (!description || typeof description !== "string") {
        return "Other";
      }

      if (description.length <= 30) {
        return description;
      }

      return description.substring(0, 30) + "...";
    }, []);

    const renderResponseItem = useCallback(
      ({ item, index }) => {
        // Safety check for null/undefined item
        if (!item || typeof item !== "object") {
          return (
            <View style={tw`p-4 border-b border-gray-200 bg-yellow-50`}>
              <Text style={tw`text-yellow-600 text-sm`}>
                Invalid response data
              </Text>
            </View>
          );
        }

        const safeItem = item || {};

        // Handle null values for all properties
        const isCurrentAgent = safeItem.is_current_agent === true;
        const responseText = safeItem.response_text || "No response";
        const isOthersResponse = responseText === "Others";

        // Get display text with null handling
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

        return (
          <TouchableOpacity
            style={[
              tw`p-4 border-b border-gray-200`,
              isCurrentAgent && tw`bg-blue-50`,
            ]}
            onPress={() => handleResponsePress(safeItem)}
            activeOpacity={0.7}
          >
            <View style={tw`flex-row justify-between items-start mb-1`}>
              <View style={tw`flex-1`}>
                <Text style={tw`font-bold text-gray-800 text-base`}>
                  {agentName}
                  {isCurrentAgent && (
                    <Text style={tw`text-blue-600 text-xs`}> (You)</Text>
                  )}
                </Text>
              </View>
              <View style={tw`items-end`}>
                <Text style={tw`text-xs text-gray-500`}>
                  {formatDate(safeItem.response_timestamp)}
                </Text>
              </View>
            </View>

            <View style={tw`flex-row justify-between items-center mt-1`}>
              <Text
                style={[
                  tw`text-sm font-medium flex-1`,
                  isOthersResponse ? tw`text-purple-600` : tw`text-green-600`,
                ]}
                numberOfLines={1}
              >
                {displayText}
              </Text>
              {safeItem.image_url && (
                <Ionicons name="camera" size={16} color="#6b7280" />
              )}
            </View>
          </TouchableOpacity>
        );
      },
      [formatDate, handleResponsePress]
    );

    const keyExtractor = useCallback((item, index) => {
      // Safe key extraction
      if (!item) return `null-item-${index}`;
      const entryId = item.entry_id;
      const responseId = item.response_id;
      return entryId
        ? `response-${entryId}`
        : responseId
          ? `response-${responseId}`
          : `response-${index}`;
    }, []);

    const getItemLayout = useCallback(
      (data, index) => ({
        length: 70,
        offset: 70 * index,
        index,
      }),
      []
    );

    try {
      const renderDetailModal = () => {
        if (!selectedResponse) return null;

        const imageUrl = getSafeImageUrl(selectedResponse.image_url);
        const responseId = selectedResponse.entry_id || selectedResponse.response_id || "detail";
        const hasImage = imageUrl && !imageError[responseId];

        return (
          <Modal
            visible={detailModalVisible}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setDetailModalVisible(false)}
            hardwareAccelerated={Platform.OS === "android"}
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
                  onPress={() => setDetailModalVisible(false)}
                  style={tw`p-2`}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#4b5563" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={tw`flex-1 p-4`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tw`pb-4`}
              >
                {/* Agent Info */}
                <View
                  style={tw`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4`}
                >
                  <Text style={tw`font-bold text-blue-800 text-lg`}>
                    {selectedResponse.agent_name ||
                      selectedResponse.agent_full_name ||
                      "Unknown Agent"}
                    {selectedResponse.is_current_agent && (
                      <Text style={tw`text-blue-600`}> (You)</Text>
                    )}
                  </Text>
                  <Text style={tw`text-blue-700 text-sm mt-1`}>
                    PT: {selectedResponse.pt_no || "N/A"}
                  </Text>
                </View>

                {/* Visit Date */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
                    Visit Date & Time:
                  </Text>
                  <Text style={tw`text-gray-600`}>
                    {formatDate(selectedResponse.response_timestamp)}
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
                      {selectedResponse.response_text || "No response recorded"}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                {selectedResponse.response_description && (
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
                      Description:
                    </Text>
                    <View
                      style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3`}
                    >
                      <Text style={tw`text-gray-800`}>
                        {selectedResponse.response_description}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Image */}
                {selectedResponse.image_url && (
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>
                      Visit Image:
                    </Text>
                    <View
                      style={tw`border border-gray-200 rounded-lg overflow-hidden`}
                    >
                      {hasImage ? (
                        <Image
                          source={{
                            uri: imageUrl,
                          }}
                          style={{
                            width: width - 32,
                            height: 300,
                          }}
                          resizeMode="contain"
                          fadeDuration={300}
                          onError={() => handleImageError(responseId)}
                          onLoadStart={() =>
                            console.log("Image loading started")
                          }
                          onLoadEnd={() => console.log("Image loading ended")}
                        />
                      ) : (
                        <View
                          style={[
                            tw`justify-center items-center bg-gray-100`,
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
                      )}
                    </View>
                  </View>
                )}

                {/* Location */}
                {selectedResponse.latitude && selectedResponse.longitude && (
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>
                      Location:
                    </Text>
                    <Text style={tw`text-gray-600 text-sm`}>
                      Latitude: {selectedResponse.latitude}, Longitude:{" "}
                      {selectedResponse.longitude}
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Close Button */}
              <View style={tw`p-4 border-t border-gray-200`}>
                <Pressable
                  onPress={() => setDetailModalVisible(false)}
                  style={[
                    tw`rounded-full px-6 py-3`,
                    { backgroundColor: "#7cc0d8" },
                  ]}
                  android_ripple={{ color: "#5aa0b8" }}
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

      // Safety check for main modal
      if (!visible) return null;

      return (
        <Modal
          visible={visible}
          animationType="slide"
          transparent={false}
          onRequestClose={onClose}
          hardwareAccelerated={Platform.OS === "android"}
        >
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
                  {customerName || "Customer"} - PT: {ptNo || "N/A"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={tw`p-2`}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={tw`px-4 py-3 bg-gray-50 border-b border-gray-200`}>
              <Text style={tw`text-sm text-gray-700`}>
                {previousResponses.length} previous visit
                {previousResponses.length !== 1 ? "s" : ""} for this PT number
              </Text>
            </View>

            {/* List */}
            {loading ? (
              <View style={tw`flex-1 justify-center items-center`}>
                <ActivityIndicator size="large" color="#7cc0d8" />
                <Text style={tw`text-gray-600 mt-2`}>
                  Loading previous visits...
                </Text>
              </View>
            ) : previousResponses.length > 0 ? (
              <FlatList
                data={previousResponses}
                renderItem={renderResponseItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={11}
                removeClippedSubviews={Platform.OS === "android"}
                updateCellsBatchingPeriod={50}
                legacyImplementation={false}
                onEndReachedThreshold={0.5}
                extraData={selectedResponse}
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
                android_ripple={{ color: "#5aa0b8" }}
              >
                <Text style={tw`text-white text-lg font-bold text-center`}>
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      );
    } catch (error) {
      console.error("PTPreviousResponses render error:", error);
      return (
        <View style={tw`flex-1 justify-center items-center`}>
          <Text style={tw`text-red-500`}>Error loading component</Text>
        </View>
      );
    }
  }
);

export default PTPreviousResponses;
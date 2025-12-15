import React, { useState, useEffect } from "react";
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
  const [previousResponses, setPreviousResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (visible && customerId && ptNo) {
      loadPreviousResponses();
    } else {
      // Reset states when modal closes
      setPreviousResponses([]);
      setSelectedResponse(null);
      setImageError(false);
    }
  }, [visible, customerId, ptNo]);

  const loadPreviousResponses = async () => {
    try {
      // Validate required parameters
      if (!customerId || !ptNo || !token || !BASE_URL) {
        console.error("Missing required parameters:", {
          customerId,
          ptNo,
          hasToken: !!token,
          hasBaseUrl: !!BASE_URL,
        });
        Alert.alert("Error", "Missing required information to load responses");
        return;
      }

      setLoading(true);
      const response = await fetch(
        `${BASE_URL}/api/get-previous-responses-by-pt/${customerId}/${ptNo}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Safely handle API response
      if (result && result.success) {
        setPreviousResponses(
          Array.isArray(result.previousResponses)
            ? result.previousResponses
            : []
        );
      } else {
        setPreviousResponses([]);
        console.log("API returned unsuccessful:", result);
      }
    } catch (error) {
      console.error("Error loading previous responses:", error);
      Alert.alert("Error", "Failed to load previous visits for this PT number");
      setPreviousResponses([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
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
  };

  const handleResponsePress = (response) => {
    if (!response) {
      console.warn("Attempted to press null response");
      return;
    }

    setSelectedResponse(response);
    setDetailModalVisible(true);
    setImageError(false);
  };

  const getSafeImageUrl = (imageUrl) => {
    if (!imageUrl) return null;

    try {
      // Handle both absolute and relative URLs
      if (imageUrl.startsWith("http")) {
        return imageUrl;
      } else if (imageUrl.startsWith("/")) {
        return `${BASE_URL}${imageUrl}`;
      } else {
        return `${BASE_URL}/${imageUrl}`;
      }
    } catch (error) {
      console.error("Error constructing image URL:", error);
      return null;
    }
  };

  const handleImageError = () => {
    console.log("Image failed to load");
    setImageError(true);
  };

  const getTruncatedDescription = (description) => {
    if (!description || typeof description !== "string") {
      return "Other";
    }

    if (description.length <= 30) {
      return description;
    }

    return description.substring(0, 30) + "...";
  };

  const renderResponseItem = ({ item, index }) => {
    // Safety check for null item
    if (!item) {
      return (
        <View style={tw`p-4 border-b border-gray-200 bg-red-50`}>
          <Text style={tw`text-red-500 text-sm`}>Invalid response data</Text>
        </View>
      );
    }

    const safeItem = item || {};

    return (
      <TouchableOpacity
        style={[
          tw`p-4 border-b border-gray-200`,
          safeItem.is_current_agent && tw`bg-blue-50`,
        ]}
        onPress={() => handleResponsePress(safeItem)}
      >
        <View style={tw`flex-row items-center`}>
          <View style={tw`flex-1`}>
            <View style={tw`flex-row justify-between items-start mb-1`}>
              <View style={tw`flex-1`}>
                <Text style={tw`font-bold text-gray-800 text-base`}>
                  {safeItem.agent_name ||
                    safeItem.agent_full_name ||
                    "Unknown Agent"}
                  {safeItem.is_current_agent && (
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
                  safeItem.response_text === "Others"
                    ? tw`text-purple-600`
                    : tw`text-green-600`,
                ]}
              >
                {safeItem.response_text === "Others"
                  ? getTruncatedDescription(safeItem.response_description)
                  : safeItem.response_text || "No response"}
              </Text>

              {safeItem.image_url && (
                <Ionicons name="camera" size={16} color="#6b7280" />
              )}
            </View>
          </View>

          <View style={tw`ml-3`}>
            <Ionicons name="chevron-forward" size={20} color="#7cc0d8"/>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => (
    <Modal
      visible={detailModalVisible}
      animationType="slide"
      onRequestClose={() => setDetailModalVisible(false)}
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
          >
            <Ionicons name="close" size={24} color="#4b5563" />
          </TouchableOpacity>
        </View>

        {selectedResponse ? (
          <ScrollView style={tw`flex-1 p-4`}>
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
                  {!imageError ? (
                    <Image
                      source={{
                        uri: getSafeImageUrl(selectedResponse.image_url),
                      }}
                      style={{
                        width: width - 32,
                        height: 300,
                        resizeMode: "cover",
                      }}
                      onError={handleImageError}
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
        ) : (
          <View style={tw`flex-1 justify-center items-center`}>
            <Text style={tw`text-gray-500`}>No response data available</Text>
          </View>
        )}

        {/* Close Button */}
        <View style={tw`p-4 border-t border-gray-200`}>
          <Pressable
            onPress={() => setDetailModalVisible(false)}
            style={[tw`rounded-full px-6 py-3`, { backgroundColor: "#7cc0d8" }]}
          >
            <Text style={tw`text-white text-lg font-bold text-center`}>
              Close Details
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  // Safety check for main modal
  if (!visible) return null;

  return (
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
              {customerName || "Customer"} - PT: {ptNo || "N/A"}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={tw`p-2`}>
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
            keyExtractor={(item, index) => {
              // Safe key extraction
              if (!item) return `null-item-${index}`;
              return `response-${item.entry_id || item.response_id || index}-${index}`;
            }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
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
            style={[tw`rounded-full px-6 py-3`, { backgroundColor: "#7cc0d8" }]}
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

export default PTPreviousResponses;

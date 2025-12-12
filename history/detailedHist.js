import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
} from "react-native";
import tw from "tailwind-react-native-classnames";

const { height } = Dimensions.get("window");

const DetailedHist = ({ person, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(height)).current;
  const [responseImageVisible, setResponseImageVisible] = useState(false);
  const [selectedResponseImage, setSelectedResponseImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
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
  }, []);

  const handleResponseImagePress = async (imageUrl) => {
    if (imageUrl) {
      setImageLoading(true);

      // Construct full image URL
      let fullImageUrl = imageUrl;
      if (!imageUrl.startsWith("http")) {
        // Add your backend base URL here
        // const SERVER_IP = "192.168.65.11"; // Replace with your actual server IP
        // const BASE_URL = `http://${SERVER_IP}:3000`;
        const BASE_URL = `./svf-recovery-backend`;
        fullImageUrl = imageUrl.startsWith("/")
          ? `${BASE_URL}${imageUrl}`
          : `${BASE_URL}/${imageUrl}`;
      }

      console.log("Loading image from:", fullImageUrl);
      setSelectedResponseImage(fullImageUrl);
      setResponseImageVisible(true);
      setImageLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
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

  // Group PT numbers by response
  const groupPTsByResponse = () => {
    if (!person || !person.allResponses) return [];

    // console.log("All responses for grouping:", person.allResponses);

    const responseGroups = {};

    person.allResponses.forEach((response) => {
      // Get PT number from various possible fields
      const ptNo =
        response.pt_no || response.pt_numbers || response.customer_id;
      const responseType =
        response.response || response.response_text || "No Response";

      if (!responseGroups[responseType]) {
        responseGroups[responseType] = {
          response: responseType,
          ptNumbers: [],
          description: response.response_description,
          image_url: response.image_url,
          visited_time: response.visited_time,
        };
      }

      if (ptNo && !responseGroups[responseType].ptNumbers.includes(ptNo)) {
        responseGroups[responseType].ptNumbers.push(ptNo);
      }
    });

    return Object.values(responseGroups);
  };

  if (!person) return null;

  const responseGroups = groupPTsByResponse();
  // console.log("Grouped responses:", responseGroups);

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
          tw`bg-white rounded-t-3xl w-full h-full p-6`,
          { paddingTop: 40 },
        ]}
      >
        <View style={tw`flex flex-row justify-end mb-4`}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Customer Name and Number */}
        <View style={tw`mb-6`}>
          <Text
            style={[tw`text-center text-3xl font-bold`, { color: "#7cc0d8" }]}
          >
            {person?.name || person?.customer_name || "Customer Details"}
          </Text>
          <Text style={tw`text-center text-lg text-gray-600 mt-2`}>
            {person?.number || person?.contact_number1 || "No Number"}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <InfoRow key="city" label="City" value={person?.city} />
          <InfoRow key="address" label="Address" value={person?.address} />

          {/* Show PT numbers grouped by response */}
          {responseGroups.length > 0 ? (
            responseGroups.map((group, index) => (
              <View
                key={index}
                style={tw`mb-4 border border-gray-200 rounded-lg p-3`}
              >
                {/* PT Numbers on left */}
                <View style={[tw`flex-row justify-between py-2`]}>
                  <Text
                    style={tw`text-base font-semibold text-gray-800 flex-1`}
                  >
                    PT Number(s)
                  </Text>
                  <View style={tw`flex-1 items-end`}>
                    <Text style={tw`text-base text-gray-700 text-right`}>
                      {group.ptNumbers.join(", ") || "N/A"}
                    </Text>
                  </View>
                </View>

                {/* Response on right */}
                <View style={[tw`flex-row justify-between py-2`]}>
                  <Text
                    style={tw`text-base font-semibold text-gray-800 flex-1`}
                  >
                    Response
                  </Text>
                  <Text style={tw`text-base text-gray-700 flex-1 text-right`}>
                    {group.response || "N/A"}
                  </Text>
                </View>

                {/* Response Description if available */}
                {group.description && (
                  <View style={[tw`flex-row justify-between py-2`]}>
                    <Text
                      style={tw`text-base font-semibold text-gray-800 flex-1`}
                    >
                      Description
                    </Text>
                    <Text style={tw`text-base text-gray-700 flex-1 text-right`}>
                      {group.description}
                    </Text>
                  </View>
                )}

                {group.image_url && (
                  <ResponseImageRow
                    label="Response Image"
                    value={group.image_url}
                    onPress={() => handleResponseImagePress(group.image_url)}
                  />
                )}
              </View>
            ))
          ) : (
            <Text style={tw`text-center text-gray-500 py-4`}>
              No PT numbers found for this customer
            </Text>
          )}

          {/* Visit Date and Time */}
          <InfoRow
            key="visit_date"
            label="Visit Date"
            value={formatDate(person.visited_time)}
          />
          <InfoRow
            key="visited_time"
            label="Visited Time"
            value={formatTime(person.visited_time)}
          />
        </ScrollView>
      </View>

      {/* Image Viewing Modal */}
      <Modal
        visible={responseImageVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setResponseImageVisible(false)}
      >
        <View
          style={tw`flex-1 bg-black bg-opacity-90 justify-center items-center`}
        >
          {imageLoading ? (
            <ActivityIndicator size="large" color="#ffffff" />
          ) : (
            <>
              <TouchableOpacity
                style={tw`absolute top-10 right-5 z-10`}
                onPress={() => setResponseImageVisible(false)}
              >
                <Ionicons name="close" size={30} color="#ffffff" />
              </TouchableOpacity>
              <Image
                source={{ uri: selectedResponseImage }}
                style={tw`w-full h-2/3`}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={(error) => {
                  console.log("Image loading error:", error.nativeEvent.error);
                  setImageLoading(false);
                  Alert.alert("Error", "Failed to load image");
                  setResponseImageVisible(false);
                }}
              />
            </>
          )}
        </View>
      </Modal>
    </Animated.View>
  );
};

const InfoRow = ({ label, value }) => {
  return (
    <View
      style={[
        tw`flex-row justify-between border-b py-3`,
        { borderBottomColor: "#e5e7eb" },
      ]}
    >
      <Text style={tw`text-base font-semibold text-gray-800 flex-1`}>
        {label}
      </Text>
      <Text style={tw`text-base text-gray-700 flex-1 text-right`}>
        {value || "N/A"}
      </Text>
    </View>
  );
};

const ResponseImageRow = ({ label, value, onPress }) => {
  return (
    <View
      style={[
        tw`flex-row justify-between border-b py-3 items-center`,
        { borderBottomColor: "#e5e7eb" },
      ]}
    >
      <Text style={tw`text-base font-semibold text-gray-800 flex-1`}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        style={tw`flex-row items-center`}
        disabled={!value}
      >
        <Text
          style={[
            tw`text-base mr-2`,
            value ? tw`text-blue-500` : tw`text-gray-400`,
          ]}
        >
          {value ? "View Image" : "No Image"}
        </Text>
        {value && <Ionicons name="eye" size={20} color="#3b82f6" />}
      </TouchableOpacity>
    </View>
  );
};

export default DetailedHist;

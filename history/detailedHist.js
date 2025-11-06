// DetailedHist.js
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
      setSelectedResponseImage(imageUrl);
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
    
    const responseGroups = {};
    
    person.allResponses.forEach((response) => {
      const ptNo = response.pt_no || response.pt_numbers;
      const responseType = response.response || "No Response";
      
      if (!responseGroups[responseType]) {
        responseGroups[responseType] = {
          response: responseType,
          ptNumbers: [],
          description: response.response_description,
          image_url: response.image_url,
          visited_time: response.visited_time
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
        
        {/* Only show name at top */}
        <Text
          style={[
            tw`text-center text-3xl font-bold mb-6`,
            { color: "#7cc0d8" },
          ]}
        >
          {person?.name || "Customer Details"}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <InfoRow key="city" label="City" value={person?.city} />
          <InfoRow key="address" label="Address" value={person?.address} />
          
          {/* Show PT numbers grouped by response */}
          {responseGroups.map((group, index) => (
            <View key={index} style={tw`mb-4`}>
              {/* PT Numbers on left */}
              <View
                style={[
                  tw`flex-row justify-between border-b py-3`,
                  { borderBottomColor: "#e5e7eb" },
                ]}
              >
                <Text style={tw`text-base font-semibold text-gray-800 flex-1`}>
                  PT Number(s)
                </Text>
                <View style={tw`flex-1 items-end`}>
                  <Text style={tw`text-base text-gray-700 text-right`}>
                    {group.ptNumbers.join(', ')}
                  </Text>
                </View>
              </View>

              {/* Response on right */}
              <View
                style={[
                  tw`flex-row justify-between border-b py-3`,
                  { borderBottomColor: "#e5e7eb" },
                ]}
              >
                <Text style={tw`text-base font-semibold text-gray-800 flex-1`}>
                  Response
                </Text>
                <Text style={tw`text-base text-gray-700 flex-1 text-right`}>
                  {group.response || "N/A"}
                </Text>
              </View>

              {/* Response Description if available */}
              {group.description && (
                <View
                  style={[
                    tw`flex-row justify-between border-b py-3`,
                    { borderBottomColor: "#e5e7eb" },
                  ]}
                >
                  <Text style={tw`text-base font-semibold text-gray-800 flex-1`}>
                    Description
                  </Text>
                  <Text style={tw`text-base text-gray-700 flex-1 text-right`}>
                    {group.description}
                  </Text>
                </View>
              )}

              {/* Response Image for this group */}
              {group.image_url && (
                <ResponseImageRow
                  label="Response Image"
                  value={group.image_url}
                  onPress={() => handleResponseImagePress(group.image_url)}
                />
              )}
            </View>
          ))}

          {/* Visit Date and Time (show from first response) */}
          {responseGroups.length > 0 && (
            <>
              <InfoRow
                key="visit_date"
                label="Visit Date"
                value={formatDate(responseGroups[0].visited_time)}
              />
              <InfoRow
                key="visited_time"
                label="Visited Time"
                value={formatTime(responseGroups[0].visited_time)}
              />
            </>
          )}
        </ScrollView>
      </View>

      {/* Image Viewing Modal */}
      <Modal
        visible={responseImageVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setResponseImageVisible(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-90 justify-center items-center`}>
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
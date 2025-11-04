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
import axios from "axios";

const { height } = Dimensions.get("window");
const API_BASE_URL = "https://your-backend-api.com/api"; // Replace with your actual API URL

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

  const handleResponseImagePress = async (responseType) => {
    if (person[responseType]) {
      setImageLoading(true);
      setSelectedResponseImage(person[responseType]);
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
          tw`bg-white rounded-t-3xl w-full h-full p-6`,
          { paddingTop: 40 },
        ]}
      >
        <Text
          style={[
            tw`text-center text-3xl font-bold mb-6`,
            { color: "#7cc0d8" },
          ]}
        >
          {person?.name || "Customer Details"}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Make sure each InfoRow has a unique key */}
          <InfoRow key="mobile" label="Mobile Number" value={person?.number} />
          <InfoRow key="city" label="City" value={person?.city} />
          <InfoRow key="address" label="Address" value={person?.address} />
          <InfoRow key="pt_no" label="PT Number" value={person?.pt_no} />
          <InfoRow
            key="visit_date"
            label="Visit Date"
            value={person?.visitDate}
          />
          <InfoRow
            key="visited_time"
            label="Visited Time"
            value={formatTime(person?.visited_time)}
          />
          <InfoRow key="response" label="Response" value={person?.response} />
          <InfoRow key="amount" label="Loan Amount" value={person?.amount} />
          <InfoRow key="paid" label="Amount Paid" value={person?.jama} />
          <InfoRow
            key="loan_created"
            label="Loan Created"
            value={person?.loanCreated}
          />
          <InfoRow key="tenure" label="Tenure" value={person?.tenure} />
          <InfoRow key="interest" label="Interest" value={person?.interest} />
          <InfoRow key="ornament" label="Ornament" value={person?.ornament} />
          <InfoRow key="letter1" label="1st Letter" value={person?.letter1} />
          <InfoRow key="letter2" label="2nd Letter" value={person?.letter2} />
          <InfoRow
            key="final_letter"
            label="Final Letter"
            value={person?.finalLetter}
          />
          <InfoRow key="last_date" label="Last Date" value={person?.lastDate} />

          {/* Response Images */}
          <ResponseImageRow
            key="response1"
            label="Response 1 Image"
            value={person?.Response1}
            onPress={() => handleResponseImagePress("Response1")}
          />
          <ResponseImageRow
            key="response2"
            label="Response 2 Image"
            value={person?.Response2}
            onPress={() => handleResponseImagePress("Response2")}
          />

          <View style={tw`mt-6 mb-10`}>
            <Pressable
              onPress={onClose}
              style={[
                tw`self-center rounded-full px-10 py-3`,
                { backgroundColor: "#7cc0d8" },
              ]}
            >
              <Text style={tw`text-white text-lg font-bold`}>Close</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
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

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import tw from "tailwind-react-native-classnames";

const { height } = Dimensions.get("window");

const DetailedHist = ({ person, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(height)).current; // slide up from bottom

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
          {person.name}
        </Text>

        <ScrollView>
          <InfoRow label="City" value={person.city} />
          <InfoRow label="PT.no" value={person.PtNo} />
          <InfoRow label="Visted Date" value={person.visitDate} />
          <InfoRow label="Loan Amount" value={person.amount} />
          <InfoRow label="Paid" value={person.jama} />
          <InfoRow label="Loan Created" value={person.loanCreated} />
          <InfoRow label="Tenure" value={person.tenure} />
          <InfoRow label="Interest" value={person.interest} />
          <InfoRow label="Ornament" value={person.ornament} />
          <InfoRow label="1st letter" value={person.letter1} />
          <InfoRow label="2st letter" value={person.letter2} />
          <InfoRow label="Final letter" value={person.finalLetter} />
          <InfoRow label="Number" value={person.number} />
          <InfoRow label="Address" value={person.address} />
          <InfoRow label="Last Date" value={person.lastDate} />
          <InfoRow
            label="Response 1"
            value={person.Response1}
            onResponseImagePress={() => setResponseImageVisible(true)}
          />
          <InfoRow
            label="Response 2"
            value={person.Response2}
            onResponseImagePress={() => setResponseImageVisible(true)}
          />
          <View style={tw`mb-2`}>
            <Pressable
              onPress={onClose}
              style={[
                tw`absolute bottom-10 self-center rounded-full px-10 py-3`,
                { backgroundColor: "#7cc0d8" },
              ]}
            >
              <Text style={tw`text-white text-lg font-bold`}>Close</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* <View style={tw`px-4`}>
          <Text style={tw`text-lg mb-4`}>
            <Text style={tw`font-bold text-gray-800`}>Number: </Text>
            <Text style={tw`text-gray-700`}>{person.number}</Text>
          </Text>

          <Text style={tw`text-lg mb-4`}>
            <Text style={tw`font-bold text-gray-800`}>Area: </Text>
            <Text style={tw`text-gray-700`}>{person.area}</Text>
          </Text>

          <Text style={tw`text-lg mb-4`}>
            <Text style={tw`font-bold text-gray-800`}>Amount: </Text>
            <Text style={tw`text-gray-700`}>{person.amount}</Text>
          </Text>

          <Text style={tw`text-lg mb-4`}>
            <Text style={tw`font-bold text-gray-800`}>Date: </Text>
            <Text style={tw`text-gray-700`}>{person.date}</Text>
          </Text>
        </View> */}
      </View>
    </Animated.View>
  );
};

const InfoRow = ({ label, value, onResponseImagePress }) => {
  const isResponse = label === "Response 1" || label === "Response 2";

  return (
    <View
      style={[
        tw`flex-row justify-between border-b py-2`,
        { borderBottomColor: "#7cc0d8" },
      ]}
    >
      <Text style={tw`text-base font-semibold text-gray-800`} numberOfLines={1}>
        {label}
      </Text>
      <Text style={tw`text-base text-gray-700 flex-1 text-right`}>{value}</Text>
      {isResponse && (
        <TouchableOpacity onPress={() => onResponseImagePress(label)}>
          <Ionicons name="image" size={24} color="black" style={tw`ml-2`} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default DetailedHist;

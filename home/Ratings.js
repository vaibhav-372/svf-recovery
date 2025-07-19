import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";

const Ratings = () => {
  const rating = Math.floor(Math.random() * 5) + 1;

  // Vertical offset to create arch effect (Y-axis shift)
  const offsets = [2, 13, 17, 13, 2];

  return (
    <View style={tw`items-center pt-4`}>
      <View style={tw`flex-row items-end justify-center`}>
        {[1, 2, 3, 4, 5].map((i, index) => (
          <View
            key={i}
            style={{ marginHorizontal: 4, marginBottom: offsets[index] }}
          >
            <Ionicons
              name={i <= rating ? "star" : "star-outline"}
              size={24}
              color="#facc15"
            />
          </View>
        ))}
        {/* <Text style={tw`ml-2 text-gray-700 font-semibold`}>{rating}.0</Text> */}
      </View>
      <Text style={tw`text-lg font-semibold`}>Your Rating {rating}.0</Text>
    </View>
  );
};

export default Ratings;

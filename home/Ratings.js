import React, { useEffect, useState } from "react";
import { View, Text, Button, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";

const Ratings = () => {
  const [token, setToken] = useState(null);
  const rating = Math.floor(Math.random() * 5) + 1;
  const offsets = [2, 13, 17, 13, 2];

  return (
    <View style={tw`items-center pt-4`}>
      <View style={tw`flex-row items-end justify-center`}>
        {[1, 2, 3, 4, 5].map((i, index) => (
          <View key={i} style={{ marginHorizontal: 4, marginBottom: offsets[index] }}>
            <Ionicons name={i <= rating ? "star" : "star-outline"} size={24} color="#facc15" />
          </View>
        ))}
      </View>
      <Text style={tw`text-lg font-semibold`}>Your Rating {rating}.0</Text>      
      {token && (
        <Text style={tw`text-xs text-gray-500 mt-2 px-4`}>
          Token: {token.substring(0, 20)}...
        </Text>
      )}
    </View>
  );
};

export default Ratings;
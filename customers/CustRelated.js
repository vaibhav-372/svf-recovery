import {
  View,
  Text,
  FlatList,
  Dimensions,
  Pressable,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import React, { useRef, useState } from "react";
import tw from "tailwind-react-native-classnames";
import CustomerData from "./Cust.json";
import ImageViewing from "react-native-image-viewing";
import jewel from "../assets/jewel.webp";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const CustRelated = ({ person, onClose }) => {
  const filteredData = CustomerData.filter(
    (item) => item.name.toLowerCase() === person.toLowerCase()
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageViewVisible, setImageViewVisible] = useState(false);
  const [responseImageVisible, setResponseImageVisible] = useState(false);
  const flatListRef = useRef(null);

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const renderItem = ({ item }) => (
    <ScrollView
      style={[tw`p-4`, { width }]}
      contentContainerStyle={{ minHeight: height }}
    >
      <View style={tw`border mb-5 p-4 rounded-lg bg-white`}>
        <InfoRow label="Loan Created" value={item.loanCreated} />
        <InfoRow label="Ornament" value={item.ornament} />
        <InfoRow label="Last Date" value={item.lastDate} />
        <InfoRow label="Amount" value={item.amount} />
        <InfoRow label="Interest" value={item.interest} />
        <InfoRow label="Tenure" value={item.tenure} />
        <InfoRow label="Paid (Jama)" value={item.jama} />
        <InfoRow label="Nominee Name" value={item.nomineeName} />
        <InfoRow label="PT No" value={item.PtNo} />
        <InfoRow label="Letter 1" value={item.letter1} />
        <InfoRow label="Letter 2" value={item.letter2} />
        <InfoRow label="Final Letter" value={item.finalLetter} />
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
        <InfoRow label="Visited" value={item.visited === 1 ? "Yes" : "No"} />
        <TouchableOpacity onPress={() => setImageViewVisible(true)}>
          <Image
            source={jewel}
            alt="jewel image"
            style={[
              tw`self-center`,
              { width: 300, height: 300, resizeMode: "contain" },
            ]}
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={tw`flex-1 bg-gray-100`}>
      <Text style={tw`text-center text-xl font-bold my-4`}>
        Related Records for {person}
      </Text>

      {filteredData.length > 0 ? (
        <>
          <FlatList
            ref={flatListRef}
            data={filteredData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewRef.current}
            viewabilityConfig={viewConfigRef.current}
          />

          {filteredData.length > 1 && (
            <View style={tw`flex-row justify-center my-4`}>
              {filteredData.map((_, index) => (
                <View
                  key={index}
                  style={[
                    tw`h-2 w-2 rounded-full mx-1`,
                    {
                      backgroundColor:
                        currentIndex === index ? "#7cc0d8" : "#ccc",
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <Text style={tw`text-center text-lg text-red-500`}>
          No records found.
        </Text>
      )}

      <Pressable
        onPress={onClose}
        style={[
          tw`absolute bottom-10 self-center px-6 py-3 rounded-full`,
          { backgroundColor: "#7cc0d8" },
        ]}
      >
        <Text style={tw`text-white text-lg font-bold`}>Close</Text>
      </Pressable>

      <ImageViewing
        images={[require("../assets/jewel.webp")]}
        imageIndex={0}
        visible={imageViewVisible}
        onRequestClose={() => setImageViewVisible(false)}
      />

      <ImageViewing
        images={[require("../assets/closed-house.webp")]}
        imageIndex={0}
        visible={responseImageVisible}
        onRequestClose={() => setResponseImageVisible(false)}
      />
    </View>
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

export default CustRelated;

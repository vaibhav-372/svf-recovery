import {
  View,
  Text,
  FlatList,
  Dimensions,
  Pressable,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import React, { useRef, useState, useEffect } from "react";
import tw from "tailwind-react-native-classnames";
import ImageViewing from "react-native-image-viewing";
import jewel from "../assets/jewel.webp";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const CustRelated = ({ person, onClose }) => {
  const [customerRecords, setCustomerRecords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageViewVisible, setImageViewVisible] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    console.log('CustRelated received:', person);
    
    if (person && person.allPTs) {
      // Use the allPTs array passed from DetailedCust
      setCustomerRecords(person.allPTs);
      console.log(`Loaded ${person.allPTs.length} PT records`);
    } else {
      setCustomerRecords([]);
    }
  }, [person]);

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  });
  
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  // Helper function to get display value
  const getDisplayValue = (item, key) => {
    const value = item[key] || 'N/A';
    return value;
  };

  // Get customer name safely
  const getCustomerName = () => {
    if (person && person.customerInfo) {
      return person.customerInfo.customer_name || person.customerInfo.name || 'Customer';
    }
    return 'Customer';
  };

  const renderItem = ({ item, index }) => {
    return (
      <ScrollView
        style={[tw`p-4`, { width: width - 32 }]}
        contentContainerStyle={{ minHeight: height - 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* PT Number Header */}
        <View style={[tw`mb-4 p-4 rounded-lg`, { backgroundColor: "#7cc0d8" }]}>
          <Text style={tw`text-center text-lg font-bold text-white`}>
            PT Number: {getDisplayValue(item, 'pt_no')}
          </Text>
          <Text style={tw`text-center text-sm text-white opacity-90 mt-1`}>
            Record {index + 1} of {customerRecords.length}
          </Text>
        </View>

        {/* Loan Details Section */}
        <View style={[tw`border mb-4 p-4 rounded-lg`, { borderColor: "#7cc0d8", backgroundColor: "#f8fafc" }]}>
          <Text style={[tw`text-lg font-semibold mb-3 text-center`, { color: "#7cc0d8" }]}>
            Loan Details
          </Text>
          
          <InfoRow label="Loan Amount" value={getDisplayValue(item, 'loan_amount')} />
          <InfoRow label="Paid Amount" value={getDisplayValue(item, 'paid_amount')} />
          <InfoRow label="Balance" value={calculateBalance(item)} />
          <InfoRow label="Interest Rate" value={getDisplayValue(item, 'interest_rate')} />
          <InfoRow label="Tenure" value={getDisplayValue(item, 'tenure')} />
          <InfoRow label="Last Date" value={getDisplayValue(item, 'last_date')} />
          <InfoRow label="Loan Created" value={getDisplayValue(item, 'loan_created_date')} />
        </View>

        {/* Ornament Details Section */}
        <View style={[tw`border mb-4 p-4 rounded-lg`, { borderColor: "#7cc0d8", backgroundColor: "#f8fafc" }]}>
          <Text style={[tw`text-lg font-semibold mb-3 text-center`, { color: "#7cc0d8" }]}>
            Ornament Details
          </Text>
          
          <InfoRow label="Ornament Type" value={getDisplayValue(item, 'ornament_name')} />
          <InfoRow label="Gross Weight" value={getDisplayValue(item, 'gross_weight')} />
          <InfoRow label="Net Weight" value={getDisplayValue(item, 'net_weight')} />
          
          <TouchableOpacity 
            onPress={() => setImageViewVisible(true)}
            style={tw`items-center mt-3`}
          >
            <Image
              source={jewel}
              style={[
                tw`self-center`,
                { width: 150, height: 150, resizeMode: "contain" },
              ]}
            />
            <Text style={tw`text-blue-500 text-sm mt-2`}>Ornament Image</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Calculate loan balance
  const calculateBalance = (item) => {
    const amount = parseFloat(getDisplayValue(item, 'loan_amount')) || 0;
    const paid = parseFloat(getDisplayValue(item, 'paid_amount')) || 0;
    return (amount - paid).toFixed(2);
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Header */}
      <View style={tw`px-4 py-3 border-b border-gray-200`}>
        <Text style={tw`text-center text-xl font-bold text-gray-800`}>
          {getCustomerName()}
        </Text>
        <Text style={tw`text-center text-sm text-gray-600 mt-1`}>
          {customerRecords.length} Loan Account(s)
        </Text>
      </View>

      {customerRecords.length > 0 ? (
        <>
          {/* Horizontal PT Records */}
          <FlatList
            ref={flatListRef}
            data={customerRecords}
            renderItem={renderItem}
            keyExtractor={(item, index) => {
              const ptNo = getDisplayValue(item, 'pt_no') || index;
              return `pt-${ptNo}-${index}`;
            }}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewRef.current}
            viewabilityConfig={viewConfigRef.current}
            snapToInterval={width}
            decelerationRate="fast"
            style={tw`flex-1`}
          />

          {/* Pagination Dots */}
          {customerRecords.length > 1 && (
            <View style={tw`py-3`}>
              <Text style={tw`text-center text-sm text-gray-600 mb-2`}>
                Swipe to view other loan accounts
              </Text>
              <View style={tw`flex-row justify-center`}>
                {customerRecords.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      tw`h-3 w-3 rounded-full mx-2`,
                      {
                        backgroundColor:
                          currentIndex === index ? "#7cc0d8" : "#cbd5e1",
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        </>
      ) : (
        <View style={tw`flex-1 justify-center items-center p-4`}>
          <Ionicons name="alert-circle-outline" size={50} color="#ef4444" />
          <Text style={tw`text-lg text-red-500 text-center mt-2`}>
            No loan records found
          </Text>
        </View>
      )}

      {/* Close Button */}
      <Pressable
        onPress={onClose}
        style={[
          tw`absolute bottom-5 self-center px-6 py-3 rounded-full`,
          { backgroundColor: "#7cc0d8" },
        ]}
      >
        <Text style={tw`text-white text-lg font-bold`}>Close</Text>
      </Pressable>

      {/* Image Viewing Modal */}
      <ImageViewing
        images={[require("../assets/jewel.webp")]}
        imageIndex={0}
        visible={imageViewVisible}
        onRequestClose={() => setImageViewVisible(false)}
      />
    </View>
  );
};

const InfoRow = ({ label, value }) => {
  return (
    <View
      style={[
        tw`flex-row justify-between border-b py-3`,
        { borderBottomColor: "#e2e8f0" },
      ]}
    >
      <Text style={tw`text-sm font-semibold text-gray-700 flex-1`}>
        {label}
      </Text>
      <Text style={tw`text-sm text-gray-600 flex-1 text-right`}>
        {value || "N/A"}
      </Text>
    </View>
  );
};

export default CustRelated;
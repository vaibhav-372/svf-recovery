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

// Interest calculation function
const calculateLoanInterest = (
  principal,
  rate,
  start_date,
  end_date,
  minimum_days = 0
) => {
  try {
    const startTimeStamp = new Date(start_date).getTime();
    const endTimeStamp = new Date(end_date).getTime() + 87600000;

    // Calculate total number of days (inclusive)
    const timeDiff = Math.abs(endTimeStamp - startTimeStamp);
    const total_days = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;

    // Create Date objects for detailed breakdown
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setDate(endDate.getDate() + 1);

    // Calculate years, months, and days difference
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    let days = endDate.getDate() - startDate.getDate();

    // Adjust for negative days
    if (days < 0) {
      months--;
      const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
      days += prevMonth.getDate();
    }

    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }

    const year = years * 360;
    const month = months * 30;
    let no_of_days = year + month + days;

    let final_total_days = no_of_days;

    if (minimum_days >= no_of_days) {
      final_total_days = minimum_days;
    } else {
      final_total_days = no_of_days;
    }

    const formatted_interval = `${years} Y, ${months} M, ${days} D`;

    let loan = parseFloat(principal);
    const monthly_rate = parseFloat(rate) / 12;
    let year_total_amount = loan;

    if (years >= 1) {
      for (let i = 1; i <= years; i++) {
        loan += (loan * 12 * monthly_rate) / 100;
      }
      year_total_amount = loan;
    }

    const month_interest = (loan * months * monthly_rate) / 100;
    const month_total_amount = year_total_amount + month_interest;

    const daily_rate = monthly_rate / 30;
    const day_interest = (loan * final_total_days * daily_rate) / 100;
    const final_total_amount = month_total_amount + day_interest;

    const interest = Math.round(final_total_amount - principal);

    return {
      interest: interest,
      days: no_of_days,
      formatted_interval: formatted_interval,
    };
  } catch (error) {
    console.log("Interest calculation error:", error);
    return {
      interest: 0,
      days: 0,
      formatted_interval: "N/A",
    };
  }
};

const CustRelated = ({ person, onClose }) => {
  const [customerRecords, setCustomerRecords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageViewVisible, setImageViewVisible] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    console.log("CustRelated received:", person);

    if (person && person.allPTs) {
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
    const value = item[key] || "N/A";
    return value;
  };

  // Helper function to extract date only from datetime string
  const getDateOnly = (dateString) => {
    if (!dateString || dateString === "N/A") return "N/A";

    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }

      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "N/A";
      }

      return date.toISOString().split("T")[0];
    } catch (error) {
      console.log("Date parsing error:", error);
      return "N/A";
    }
  };

  // Calculate interest amount for a loan record
  const calculateInterestAmount = (item) => {
    const principal = parseFloat(getDisplayValue(item, "loan_amount")) || 0;
    const rate = parseFloat(getDisplayValue(item, "interest_rate")) || 0;
    const startDate = getDisplayValue(item, "loan_created_date");
    const endDate = getDisplayValue(item, "last_date");

    if (
      startDate === "N/A" ||
      endDate === "N/A" ||
      principal === 0 ||
      rate === 0
    ) {
      return "N/A";
    }

    let minimum_days_for_interest;
    
    if(rate == '24'){
      minimum_days_for_interest = 15
    }
    else{
      minimum_days_for_interest = 30
    }

    console.log('rate of interest:', rate);

    const result = calculateLoanInterest(
      principal,
      rate,
      startDate,
      endDate,
      minimum_days_for_interest
    );
    return result.interest;
  };

  // Get customer name safely
  const getCustomerName = () => {
    if (person && person.customerInfo) {
      return (
        person.customerInfo.customer_name ||
        person.customerInfo.name ||
        "Customer"
      );
    }
    return "Customer";
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
            PT Number: {getDisplayValue(item, "pt_no")}
          </Text>
          <Text style={tw`text-center text-sm text-white opacity-90 mt-1`}>
            Record {index + 1} of {customerRecords.length}
          </Text>
        </View>

        {/* Loan Details Section */}
        <View
          style={[
            tw`border mb-4 p-4 rounded-lg`,
            { borderColor: "#7cc0d8", backgroundColor: "#f8fafc" },
          ]}
        >
          <Text
            style={[
              tw`text-lg font-semibold mb-3 text-center`,
              { color: "#7cc0d8" },
            ]}
          >
            Loan Details
          </Text>

          <InfoRow
            label="Loan Amount"
            value={getDisplayValue(item, "loan_amount")}
          />
          <InfoRow
            label="Paid Amount"
            value={getDisplayValue(item, "paid_amount")}
          />
          <InfoRow label="Balance" value={calculateBalance(item)} />
          <InfoRow
            label="Interest Rate"
            value={getDisplayValue(item, "interest_rate")}
          />
          <InfoRow
            label="Interest Amount"
            value={calculateInterestAmount(item)}
          />
          <InfoRow label="Tenure" value={getDisplayValue(item, "tenure")} />
          <InfoRow
            label="Loan Created"
            value={getDateOnly(getDisplayValue(item, "loan_created_date"))}
          />
          <InfoRow
            label="Last Date"
            value={getDateOnly(getDisplayValue(item, "last_date"))}
          />
          <InfoRow
            label="1st Letter"
            value={getDateOnly(getDisplayValue(item, "first_letter_date"))}
          />
          <InfoRow
            label="2nd Letter"
            value={getDateOnly(getDisplayValue(item, "second_letter_date"))}
          />
          <InfoRow
            label="3rd Letter"
            value={getDateOnly(getDisplayValue(item, "final_letter_date"))}
          />
        </View>

        {/* Ornament Details Section */}
        <View
          style={[
            tw`border mb-4 p-4 rounded-lg`,
            { borderColor: "#7cc0d8", backgroundColor: "#f8fafc" },
          ]}
        >
          <Text
            style={[
              tw`text-lg font-semibold mb-3 text-center`,
              { color: "#7cc0d8" },
            ]}
          >
            Ornament Details
          </Text>

          <InfoRow
            label="Ornament Type"
            value={getDisplayValue(item, "ornament_name")}
          />
          <InfoRow
            label="Gross Weight"
            value={getDisplayValue(item, "gross_weight")}
          />
          <InfoRow
            label="Net Weight"
            value={getDisplayValue(item, "net_weight")}
          />

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
    const amount = parseFloat(getDisplayValue(item, "loan_amount")) || 0;
    const paid = parseFloat(getDisplayValue(item, "paid_amount")) || 0;
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
              const ptNo = getDisplayValue(item, "pt_no") || index;
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
          tw`absolute bottom-3 self-center px-6 py-3 rounded-full`,
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

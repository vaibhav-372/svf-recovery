import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  Switch,
  ScrollView,
  Alert,
  Modal,
  Image,
} from "react-native";
import tw from "tailwind-react-native-classnames";
import Entypo from "@expo/vector-icons/Entypo";
import Customers from "./Customers";
import CustRelated from "./CustRelated";
import jewel from "../assets/jewel.webp";

const { height } = Dimensions.get("window");

const DetailedCust = ({ person, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(height)).current;
  const [isVisited, setIsVisited] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  useEffect(() => {
    if (person) {
      setIsVisited(person.visited === 1); // update toggle state based on person.visited

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
    }
  }, [person]);

  if (!person) return null;

  const handleToggle = () => {
    // setIsVisited(previousState => !previousState);
    Alert.alert(
      "Confirm",
      isVisited ? "Mark as not visited?" : "Mark as visited?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => {
            setIsVisited((previousState) => !previousState);
            // handle backend update here if needed
          },
        },
      ]
    );
  };

  const relatedLoans = (personName) => {
    // Alert.alert(`NAME`, `name is ${personName}`);
    setSelectedPerson(personName);
  };

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
          tw`bg-white rounded-t-3xl w-full h-full px-6 pb-10`,
          { paddingTop: 40 },
        ]}
      >
        <View style={tw`flex flex-row justify-end`}>
          <Entypo 
          name="camera" 
          size={24} 
          color="black" 
          style={tw`mx-2`} 
          />
          <Entypo
            onPress={() => {
              relatedLoans(person.name);
              setModalVisible(true);
            }}
            name="list"
            size={24}
            color="black"
            style={tw`mx-2`}
          />
        </View>
        <Text
          style={[
            tw`text-center text-3xl font-bold mb-6`,
            { color: "#7cc0d8" },
          ]}
        >
          {person.name}
        </Text>

        <ScrollView style={tw`px-2`}>
          <InfoRow label="Area" value={person.area} />
          <InfoRow label="Nominee Name" value={person.nomineeName} />
          <InfoRow label="PT.no" value={person.PtNo} />
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
          <InfoRow label="Response1" value={person.Response1} />
          <InfoRow label="Response2" value={person.Response2} />
          <Image
            source={jewel}
            alt="jewel image"
            style={[
              tw`m-9 self-center`,
              {resizeMode: "contain" },
            ]}
          />

          <View
            style={tw`flex-row justify-between items-center border-t border-b pb-2 border-gray-200`}
          >
            <Text style={tw`text-lg font-semibold text-gray-800`}>Visited</Text>
            <Switch
              trackColor={{ false: "#ccc", true: "#7cc0d8" }}
              thumbColor={isVisited ? "#fff" : "#f4f3f4"}
              ios_backgroundColor="#ccc"
              onValueChange={handleToggle}
              value={isVisited}
            />
          </View>
        </ScrollView>

        <Pressable
          onPress={onClose}
          style={[
            tw`absolute bottom-5 self-center rounded-full px-10 py-3`,
            { backgroundColor: "#7cc0d8" },
          ]}
        >
          <Text style={tw`text-white text-lg font-bold`}>Close</Text>
        </Pressable>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <CustRelated
            person={selectedPerson}
            onClose={() => setModalVisible(false)}
          />
        </Modal>
      </View>
    </Animated.View>
  );
};

const InfoRow = ({ label, value }) => (
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
  </View>
);

export default DetailedCust;

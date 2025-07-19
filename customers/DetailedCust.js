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
  TextInput,
  TouchableOpacity,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import tw from "tailwind-react-native-classnames";
import Entypo from "@expo/vector-icons/Entypo";
import CustRelated from "./CustRelated";
import jewel from "../assets/jewel.webp";
import CameraComponent from "./CameraComponent";
import MapWebView from "./MapWebView";
import ImageViewing from "react-native-image-viewing";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

const DetailedCust = ({ person, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(height)).current;
  const [isVisited, setIsVisited] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [ornamentViewVisible, setOrnamentViewVisible] = useState(false);
  const [imageViewVisible, setImageViewVisible] = useState(false);
  const [responseImageVisible, setResponseImageVisible] = useState(false);
  const [customerResponse, setCustomerResponse] = useState("");
  const [selectedResponse, setSelectedResponse] = useState("");

  useEffect(() => {
    if (person) {
      setIsVisited(person.visited === 1);

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

  const handleToggle = () => {
    Alert.alert(
      "Confirm",
      isVisited ? "Mark as not visited?" : "Mark as visited?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: () => setIsVisited((prev) => !prev),
        },
      ]
    );
  };

  const relatedLoans = (personName) => {
    setSelectedPerson(personName);
  };

  const handleCapture = (data) => {
    console.log("Captured Data: ", data);
    setCapturedImage(data);
    setCameraVisible(false);
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
          tw`bg-white rounded-t-3xl w-full h-full px-2 pb-5`,
          { paddingTop: 40 },
        ]}
      >
        <View style={tw`flex flex-row justify-end`}>
          <Entypo
            name="camera"
            size={24}
            color="black"
            style={tw`mx-2`}
            onPress={() => setCameraVisible(true)}
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

        <View>
          <Text
            style={[
              tw`text-center text-3xl font-bold mb-6`,
              { color: "#7cc0d8" },
            ]}
          >
            {person.name}
          </Text>
        </View>

        <ScrollView style={tw`px-2`}>
          {/* Info Rows */}
          <View
            style={[
              tw`border-2 rounded-lg p-4 mb-4`,
              { borderColor: "#7cc0d8" },
            ]}
          >
            <Text
              style={[
                tw`text-lg font-semibold mb-2`,
                {
                  color: "#7cc0d8",
                  textShadowColor: "#000",
                  textShadowOffset: { width: -1, height: 1 },
                  textShadowRadius: 1,
                },
              ]}
            >
              Personal Information
            </Text>
            <InfoRow label="Area" value={person.area} />
            <InfoRow label="Address" value={person.address} />
            <InfoRow label="Ph.no" value={person.number} />
            <InfoRow label="Nominee Name" value={person.nomineeName} />
            <InfoRow label="PT.no" value={person.PtNo} />
          </View>

          <View
            style={[
              tw`border-2 rounded-lg p-4 mb-4`,
              { borderColor: "#7cc0d8" },
            ]}
          >
            <Text
              style={[
                tw`text-lg font-semibold text-gray-800 mb-2`,
                {
                  color: "#7cc0d8",
                  textShadowColor: "#000",
                  textShadowOffset: { width: -1, height: 1 },
                  textShadowRadius: 1,
                },
              ]}
            >
              Loan Details
            </Text>
            <InfoRow label="Ornament" value={person.ornament} />
            <InfoRow label="Loan Created" value={person.loanCreated} />
            <InfoRow label="Loan Amount" value={person.amount} />
            <InfoRow label="Interest" value={person.interest} />
            <InfoRow label="Tenure" value={person.tenure} />
            <InfoRow label="Paid" value={person.jama} />
            <InfoRow label="Last Date" value={person.lastDate} />
          </View>

          <View
            style={[
              tw`border-2 rounded-lg p-4 mb-4`,
              { borderColor: "#7cc0d8" },
            ]}
          >
            <Text
              style={[
                tw`text-lg font-semibold mb-2`,
                {
                  color: "#7cc0d8",
                  textShadowColor: "#000",
                  textShadowOffset: { width: -1, height: 1 },
                  textShadowRadius: 1,
                },
              ]}
            >
              Customer History
            </Text>

            <InfoRow label="1st letter" value={person.letter1} />
            <InfoRow label="2nd letter" value={person.letter2} />
            <InfoRow label="Final letter" value={person.finalLetter} />
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
          </View>

          <View style={tw`mt-3`}>
            <Text
              style={[
                tw`text-lg font-semibold mb-1`,
                {
                  color: "#7cc0d8",
                  textShadowColor: "#000",
                  textShadowOffset: { width: -1, height: 1 },
                  textShadowRadius: 1,
                },
              ]}
            >
              Customer Response
            </Text>

            <View style={tw`flex-row items-center`}>
              <View
                style={tw`flex-1 border border-gray-300 rounded-lg bg-white mr-2`}
              >
                <RNPickerSelect
                  onValueChange={(value) => setSelectedResponse(value)}
                  placeholder={{ label: "Select a response...", value: "" }}
                  items={[
                    { label: "Call not lifting", value: "Call not lifting" },
                    {
                      label: "Customer not at home",
                      value: "Customer not at home",
                    },
                    { label: "Requested time", value: "Requested time" },
                    { label: "Others", value: "Others" },
                  ]}
                  style={{
                    inputAndroid: {
                      ...tw`text-base text-gray-800 pl-3 pr-3`,
                    },
                    placeholder: {
                      color: "gray",
                    },
                  }}
                />
              </View>

              <TouchableOpacity
                onPress={() => {
                  console.log(
                    "Saved Response:",
                    selectedResponse,
                    customerResponse
                  );
                  Alert.alert("Saved", "Customer response saved successfully");
                  setSelectedResponse("");
                  setCustomerResponse("");
                }}
                style={tw`bg-green-500 px-4 py-2 rounded-lg`}
              >
                <Text style={tw`text-white font-bold`}>Save</Text>
              </TouchableOpacity>
            </View>

            {selectedResponse === "Others" && (
              <TextInput
                value={customerResponse}
                onChangeText={setCustomerResponse}
                placeholder="Enter customer response..."
                multiline
                numberOfLines={4}
                style={tw`border border-gray-300 rounded-lg p-3 mt-3 text-base text-gray-800 bg-white`}
              />
            )}
          </View>

          <View style={tw`mt-5`}>
            <Text
              style={[
                tw`text-lg font-semibold`,
                {
                  color: "#7cc0d8",
                  textShadowColor: "#000",
                  textShadowOffset: { width: -1, height: 1 },
                  textShadowRadius: 1,
                },
              ]}
            >
              CUSTOMER ORNAMENT
            </Text>
            <TouchableOpacity onPress={() => setOrnamentViewVisible(true)}>
              <Image
                source={jewel}
                style={[tw`m-5 self-center w-48 h-48`, { resizeMode: "cover" }]}
              />
            </TouchableOpacity>
          </View>

          {capturedImage && (
            <View style={tw`my-4`}>
              <Text
                style={tw`text-center text-lg font-bold text-gray-800 mb-2`}
              >
                Captured Image
              </Text>
              <TouchableOpacity onPress={() => setImageViewVisible(true)}>
                <Image
                  source={{ uri: capturedImage.imageUri }}
                  style={[tw`w-full h-64`, { borderRadius: 10 }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          )}

          {capturedImage?.location && (
            <View style={tw`my-5`}>
              <Text
                style={tw`text-center text-lg font-bold text-gray-800 mb-1`}
              >
                Location of customer
              </Text>
              <MapWebView
                latitude={capturedImage.location.latitude}
                longitude={capturedImage.location.longitude}
              />
            </View>
          )}

          <View
            style={tw`flex-row justify-between items-center border-t border-b pb-20 border-gray-200`}
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

          <Pressable
            onPress={onClose}
            style={[
              tw`absolute bottom-5 self-center rounded-full px-10 py-3`,
              { backgroundColor: "#7cc0d8" },
            ]}
          >
            <Text style={tw`text-white text-lg font-bold`}>Close</Text>
          </Pressable>
        </ScrollView>

        <Modal animationType="slide" transparent={true} visible={modalVisible}>
          <CustRelated
            person={selectedPerson}
            onClose={() => setModalVisible(false)}
          />
        </Modal>

        <Modal visible={cameraVisible} animationType="slide">
          <CameraComponent
            onCapture={handleCapture}
            onClose={() => setCameraVisible(false)}
          />
        </Modal>

        <ImageViewing
          images={[{ uri: capturedImage?.imageUri }]}
          imageIndex={0}
          visible={imageViewVisible}
          onRequestClose={() => setImageViewVisible(false)}
        />

        <ImageViewing
          images={[require("../assets/jewel.webp")]}
          imageIndex={0}
          visible={ornamentViewVisible}
          onRequestClose={() => setOrnamentViewVisible(false)}
        />

        <ImageViewing
          images={[require("../assets/closed-house.webp")]}
          imageIndex={0}
          visible={responseImageVisible}
          onRequestClose={() => setResponseImageVisible(false)}
        />
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

export default DetailedCust;

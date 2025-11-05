import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  SafeAreaView,
  ScrollView,
} from "react-native";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import * as Progress from "react-native-progress";
import HomeCharts from "./HomeCharts";
import HomeHist from "./HomeHist";
import Ratings from "./Ratings";
import { useAuth } from "../context/AuthContext";
import CusList from "./cusList";
import { useNavigation } from "@react-navigation/native";
// import { Image } from 'react-native-svg'

const Home = () => {
  const { user, token } = useAuth();
  const navigation = useNavigation();

  const visits = 73;
  const total = 194;
  const progress = visits / total;

  const dist = 24;
  const days = 3;
  const travel = dist / days;

  const handlePendingPress = () => {
    navigation.navigate("Customers", {
      agentName: user?.username,
      initialTab: "pending",
    });
  };

  const handleVisitedPress = () => {
    navigation.navigate("Customers", {
      agentName: user?.username,
      initialTab: "visited",
    });
  };

  const handleHistoryPress = () => {
    // Add navigation for History List if needed
    console.log("History List pressed");
  };

  const handleSettingsPress = () => {
    // Add navigation for Settings if needed
    console.log("Settings pressed");
  };

  // Card data with handlers
  const cardData = [
    {
      icon: require("../assets/pending-list.png"),
      title: "Pending List",
      onPress: handlePendingPress,
    },
    {
      icon: require("../assets/visited-list.png"),
      title: "Visited List",
      onPress: handleVisitedPress,
    },
    {
      icon: require("../assets/history-list.png"),
      title: "History List",
      onPress: handleHistoryPress,
    },
    {
      icon: require("../assets/settings.png"),
      title: "Settings",
      onPress: handleSettingsPress,
    },
  ];

  return (
    <ScrollView style={tw`bg-white flex-1`}>
      {/* <ImageBackground
              source={require('../assets/bg.jpg')}
              style={{ flex: 1 }}
              resizeMode="cover"
            >               */}
      <View style={tw`flex-row justify-between items-center px-4 py-3`}>
        {/* Left: Greeting */}
        <View style={tw`flex-row items-center`}>
          {/* Optional location icon */}
          {/* <Ionicons name="location-outline" size={20} color="#7cc0d8" /> */}
          <Text style={tw`ml-1 text-base font-semibold text-gray-800`}>
            Hi {user?.username}
          </Text>
          {/* <Ionicons
            name="chevron-down-outline"
            size={16}
            color="#4B5563"
            style={tw`ml-1`}
          /> */}
        </View>

        {/* Right: PNL + Avatar */}
        <View style={tw`flex-row items-center`}>
          {/* <Text style={tw`font-medium text-xl mr-2`}>PNL</Text> */}
          <Image
            source={require("../assets/kohli.webp")}
            style={{ width: 40, height: 40, borderRadius: 20 }}
          />
        </View>
      </View>

      <Text style={tw`text-center text-2xl font-extrabold`}>PNL recovery</Text>
      {/* <Text>{Date()}</Text> */}

      <View style={tw`flex-row justify-around mt-5 px-4`}>
        <Ratings />
        <View style={tw`items-center`}>
          <Progress.Circle
            size={120}
            progress={progress}
            thickness={10}
            showsText={true}
            formatText={() => `${visits}/${total}`}
            color="#7cc0d8"
            unfilledColor="#E5E7EB"
            borderWidth={0}
            textStyle={{ fontWeight: "bold", color: "#1F2937" }}
          />
          <Text style={tw`mt-2 text-gray-600 text-base font-bold`}>Visits</Text>
        </View>

        {/* <View style={tw`items-center`}>
          <Progress.Circle
            size={120}
            progress={travel / 10}
            thickness={10}
            showsText={true}
            formatText={() => `${dist}/${days}`}
            color="#7cc0d8"
            unfilledColor="#E5E7EB"
            borderWidth={0}
            textStyle={{ fontWeight: "bold", color: "#1F2937" }}
          />
          <Text style={tw`mt-2 text-gray-600 text-base font-bold`}>
            Avg travel/day: {travel.toFixed(1)}
          </Text>
        </View> */}
      </View>

      <View style={tw`flex flex-row flex-wrap justify-between px-4 mt-4`}>
        {cardData.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={tw`w-1/2 ${index % 2 === 0 ? "pr-2" : "pl-2"}`}
            onPress={item.onPress}
          >
            <View
              style={[
                tw`bg-white p-5 mb-4 rounded-lg shadow flex flex-col justify-between`,
                {
                  borderLeftWidth: 5,
                  borderLeftColor: "#7cc0d8",
                  elevation: 5,
                },
              ]}
            >
              <View
                style={tw`flex-row items-center w-full justify-between mb-3`}
              >
                <Image source={item.icon} style={tw`w-12 h-12`} />
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </View>
              <Text style={tw`font-bold text-lg text-gray-800 text-center`}>
                {item.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* <Text style={tw`text-lg font-bold p-3`}>{new Date().toLocaleDateString()}</Text> */}
      {/* <CusList /> */}
      {/* </ImageBackground> */}
      <HomeCharts />
      {/* <HomeHist /> */}
    </ScrollView>
  );
};

export default Home;

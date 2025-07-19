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
import CusList from "./cusList";
import HomeCharts from "./homeCharts";
import HomeHist from "./homeHist";
import Ratings from "./Ratings";
// import { Image } from 'react-native-svg'

const Home = () => {
  const visits = 73;
  const total = 194;
  const progress = visits / total;

  const dist = 24;
  const days = 3;
  const travel = dist / days;

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
            Hi Vaibhav
          </Text>
          <Ionicons
            name="chevron-down-outline"
            size={16}
            color="#4B5563"
            style={tw`ml-1`}
          />
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
      <Ratings />
      {/* <Text>{Date()}</Text> */}

      <View style={tw`flex-row justify-around mt-5 px-4`}>
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

        <View style={tw`items-center`}>
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
        </View>
      </View>
      {/* <Text style={tw`text-lg font-bold p-3`}>{new Date().toLocaleDateString()}</Text> */}
      <CusList />
      {/* </ImageBackground> */}
      <HomeCharts />
      <HomeHist />
    </ScrollView>
  );
};

export default Home;

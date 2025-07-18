import React from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

const MapWebView = ({ latitude, longitude }) => {
  if (!latitude || !longitude) return null;

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.001},${latitude-0.001},${longitude+0.001},${latitude+0.001}&layer=mapnik&marker=${latitude},${longitude}`;

  return (
    <View style={{ height: 200, marginTop: 10 }}>
      <WebView
        source={{ uri: mapUrl }}
        style={{ flex: 1 }}
      />
    </View>
  );
};

export default MapWebView;

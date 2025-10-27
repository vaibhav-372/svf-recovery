import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import tw from "tailwind-react-native-classnames";
import Entypo from "@expo/vector-icons/Entypo";
import CustRelated from "./CustRelated";
import CameraComponent from "./CameraComponent";
import MapWebView from "./MapWebView";
import ImageViewing from "react-native-image-viewing";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

const { height } = Dimensions.get("window");

const DetailedCust = ({ person, onClose, onResponseSaved }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(height)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageViewVisible, setImageViewVisible] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState("");
  const [responseDescription, setResponseDescription] = useState("");
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [existingResponse, setExistingResponse] = useState(null);
  const [isAlreadyVisited, setIsAlreadyVisited] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Check Status, 2: Capture Image, 3: Save Response

  const { token } = useAuth();
  const SERVER_IP = "192.168.65.11";
  const BASE_URL = `http://${SERVER_IP}:3000`;

  useEffect(() => {
    if (person) {
      console.log(
        "DetailedCust opened for person:",
        person.customer_id,
        person.customer_name
      );
      resetForm();
      checkCustomerStatus();
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

  // Reset form when person changes
  const resetForm = () => {
    setSelectedResponse("");
    setResponseDescription("");
    setCapturedImage(null);
    setUploadedImageUrl(null);
    setExistingResponse(null);
    setIsAlreadyVisited(false);
    setCheckingExisting(false);
    setCurrentStep(1);
  };

  // STEP 1: Check if customer is already visited
  const checkCustomerStatus = async () => {
    try {
      const customerId = person.customer_id || person.entry_id;

      if (!customerId) {
        console.log("No customer ID found");
        Alert.alert("Error", "Customer ID not found");
        return;
      }

      setCheckingExisting(true);
      console.log("STEP 1: Checking customer status for:", customerId);

      const response = await fetch(
        `${BASE_URL}/api/check-customer-status/${customerId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("Customer status check result:", result);

        if (result.success) {
          if (result.isVisited) {
            // Customer already visited - show existing data
            setIsAlreadyVisited(true);
            setExistingResponse(result.existingResponse);

            // Pre-fill the form with existing data
            if (result.existingResponse) {
              setSelectedResponse(
                result.existingResponse.response_type ||
                  result.existingResponse.response_text
              );
              setResponseDescription(
                result.existingResponse.response_description
              );

              // Set captured image data if available - IMPORTANT: Set image for visited customers
              if (result.existingResponse.image_url) {
                const fullImageUrl =
                  result.existingResponse.image_url.startsWith("http")
                    ? result.existingResponse.image_url
                    : `${BASE_URL}${result.existingResponse.image_url}`;

                setCapturedImage({
                  imageUri: fullImageUrl,
                  location:
                    result.existingResponse.latitude &&
                    result.existingResponse.longitude
                      ? {
                          latitude: result.existingResponse.latitude,
                          longitude: result.existingResponse.longitude,
                        }
                      : null,
                });
                setUploadedImageUrl(result.existingResponse.image_url);
              }
            }
            setCurrentStep(1); // Stay on step 1 (view only)
          } else {
            // Customer not visited - proceed to step 2
            setIsAlreadyVisited(false);
            setCurrentStep(2); // Move to response selection
          }
        } else {
          Alert.alert("Error", "Failed to check customer status");
        }
      } else {
        console.log("Response not OK, status:", response.status);
        Alert.alert("Error", "Failed to check customer status");
      }
    } catch (error) {
      console.error("Error checking customer status:", error);
      Alert.alert("Error", "Failed to check customer status");
    } finally {
      setCheckingExisting(false);
    }
  };

  const fetchAllCustomerPTs = async (customerId) => {
    try {
      setLoadingRelated(true);

      let response = await fetch(
        `${BASE_URL}/api/customers/${customerId}/loans`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 404) {
        console.log("Customer ID endpoint not found, trying by name...");
        const customerName = person.customer_name || person.name;
        response = await fetch(
          `${BASE_URL}/api/customers/${encodeURIComponent(customerName)}/loans-by-name`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log(`Fetched ${data.loans.length} PT records for customer`);
        return data.loans;
      } else {
        throw new Error(data.message || "Failed to fetch customer loans");
      }
    } catch (error) {
      console.error("Error fetching customer PTs:", error);

      if (!error.message.includes("404")) {
        Alert.alert("Error", "Failed to load customer loan details");
      }

      return [];
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleViewDetails = async () => {
    if (loadingRelated) return;

    try {
      const customerId = person.customer_id || person.entry_id;

      if (!customerId) {
        Alert.alert("Error", "Customer ID not found");
        return;
      }

      console.log("Fetching all PTs for customer:", customerId);

      setLoadingRelated(true);
      const allPTs = await fetchAllCustomerPTs(customerId);

      const customerData = {
        customerInfo: person,
        allPTs: allPTs.length > 0 ? allPTs : [person],
      };

      setSelectedPerson(customerData);
      setModalVisible(true);
    } catch (error) {
      console.error("Error in handleViewDetails:", error);
      setSelectedPerson({
        customerInfo: person,
        allPTs: [person],
      });
      setModalVisible(true);
    }
  };

  // STEP 2: Handle response selection
  const handleResponseSelect = (value) => {
    setSelectedResponse(value);
    if (value !== "Others") {
      setResponseDescription(value); // Auto-fill description with selected response
    } else {
      setResponseDescription(""); // Clear for Others
    }
  };

  // STEP 3: Handle image capture
  const handleCapture = (data) => {
    if (isAlreadyVisited) {
      Alert.alert(
        "Already Visited",
        "This customer has already been visited. Cannot capture new image."
      );
      return;
    }

    console.log("STEP 3: Image captured:", data);
    setCapturedImage(data);
    setCameraVisible(false);
    setCurrentStep(3); // Move to save step
  };

  // Upload image to server
  const uploadImageToServer = async (imageUri) => {
    try {
      console.log("Uploading image:", imageUri);

      const formData = new FormData();
      formData.append("image", {
        uri: imageUri,
        type: "image/jpeg",
        name: `recovery_${person.customer_id}_${Date.now()}.jpg`,
      });
      formData.append("customer_id", person.customer_id);

      const response = await fetch(`${BASE_URL}/api/upload-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("Image uploaded successfully:", result.image_url);
        return result.image_url;
      } else {
        throw new Error(result.message || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  // Save response to database
  const saveResponseToDatabase = async () => {
    if (isAlreadyVisited) {
      Alert.alert(
        "Already Visited",
        "This customer has already been visited. Cannot update response."
      );
      return;
    }

    // STRICT VALIDATION: Check if all required fields are present
    if (!selectedResponse) {
      Alert.alert(
        "Response Required",
        "Please select a customer response before saving."
      );
      return;
    }

    if (!capturedImage) {
      Alert.alert("Image Required", "Please capture an image before saving.");
      return;
    }

    if (selectedResponse === "Others" && !responseDescription.trim()) {
      Alert.alert(
        "Description Required",
        "Please provide a description for the 'Others' response."
      );
      return;
    }

    try {
      setSaving(true);

      // Upload the image first
      let imageUrl = null;
      try {
        imageUrl = await uploadImageToServer(capturedImage.imageUri);
        setUploadedImageUrl(imageUrl);
      } catch (uploadError) {
        console.error("Failed to upload image:", uploadError);
        Alert.alert(
          "Image Upload Failed",
          "Cannot save response without image. Please try capturing the image again.",
          [{ text: "OK" }]
        );
        setSaving(false);
        return;
      }

      // Prepare response data
      const responseData = {
        customer_id: person.customer_id || person.entry_id,
        response_type: selectedResponse,
        response_description: responseDescription || selectedResponse,
        image_url: imageUrl,
        latitude: capturedImage?.location?.latitude || null,
        longitude: capturedImage?.location?.longitude || null,
      };

      console.log("Saving response with data:", responseData);

      const response = await fetch(`${BASE_URL}/api/save-recovery-response`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(responseData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response error:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("Response saved successfully:", result);

        // Call the callback to notify parent component
        if (onResponseSaved) {
          onResponseSaved(person.customer_id || person.entry_id);
        }

        Alert.alert(
          "Success",
          `Response saved successfully for ${result.pt_count} loan account(s)!`,
          [
            {
              text: "OK",
              onPress: onClose,
            },
          ]
        );
      } else {
        throw new Error(result.message || "Failed to save response");
      }
    } catch (error) {
      console.error("Error in save process:", error);
      Alert.alert("Error", "Failed to save response. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle save button press
  const handleSave = () => {
    if (isAlreadyVisited) {
      Alert.alert("Already Visited", "This customer has already been visited.");
      return;
    }

    // Final validation before saving
    if (!selectedResponse || !capturedImage) {
      Alert.alert(
        "Incomplete Data",
        "Please complete all required steps before saving."
      );
      return;
    }

    Alert.alert(
      "Confirm Save",
      "This response will be saved for all loan accounts of this customer. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Save", onPress: saveResponseToDatabase },
      ]
    );
  };

  // Check if save button should be enabled
  const isSaveEnabled =
    !isAlreadyVisited &&
    selectedResponse &&
    capturedImage &&
    (selectedResponse !== "Others" || responseDescription.trim());

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
          tw`bg-white rounded-t-3xl w-full h-full px-4 pb-5`,
          { paddingTop: 40 },
        ]}
      >
        {/* Header with Icons */}
        <View style={tw`flex flex-row justify-between items-center mb-4`}>
          {/* View All Loans Button */}
          <TouchableOpacity
            onPress={handleViewDetails}
            style={tw`flex-row items-center`}
            disabled={loadingRelated}
          >
            {loadingRelated ? (
              <ActivityIndicator size="small" color="#7cc0d8" />
            ) : (
              <Entypo name="list" size={24} color="#7cc0d8" />
            )}
            <Text
              style={[
                tw`ml-1 text-sm`,
                loadingRelated ? tw`text-gray-500` : tw`text-blue-500`,
              ]}
            >
              {loadingRelated ? "Loading..." : "View All Loans"}
            </Text>
          </TouchableOpacity>

          {/* Camera Button */}
          <TouchableOpacity
            onPress={() => (isAlreadyVisited ? null : setCameraVisible(true))}
            disabled={isAlreadyVisited || checkingExisting}
          >
            {checkingExisting ? (
              <ActivityIndicator size="small" color="#9ca3af" />
            ) : (
              <Entypo
                name="camera"
                size={24}
                color={isAlreadyVisited ? "#9ca3af" : "#7cc0d8"}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Progress Steps */}
        {/* <View style={tw`flex-row justify-between items-center mb-4`}>
          <View style={tw`flex-row items-center`}>
            <View
              style={[
                tw`w-6 h-6 rounded-full items-center justify-center`,
                currentStep >= 1 ? tw`bg-green-500` : tw`bg-gray-300`,
              ]}
            >
              <Text style={tw`text-white text-xs font-bold`}>1</Text>
            </View>
            <Text
              style={tw`text-xs ml-1 ${currentStep >= 1 ? "text-green-600" : "text-gray-500"}`}
            >
              Check Status
            </Text>
          </View>

          <View style={tw`flex-row items-center`}>
            <View
              style={[
                tw`w-6 h-6 rounded-full items-center justify-center`,
                currentStep >= 2 ? tw`bg-green-500` : tw`bg-gray-300`,
              ]}
            >
              <Text style={tw`text-white text-xs font-bold`}>2</Text>
            </View>
            <Text
              style={tw`text-xs ml-1 ${currentStep >= 2 ? "text-green-600" : "text-gray-500"}`}
            >
              Add Response
            </Text>
          </View>

          <View style={tw`flex-row items-center`}>
            <View
              style={[
                tw`w-6 h-6 rounded-full items-center justify-center`,
                currentStep >= 3 ? tw`bg-green-500` : tw`bg-gray-300`,
              ]}
            >
              <Text style={tw`text-white text-xs font-bold`}>3</Text>
            </View>
            <Text
              style={tw`text-xs ml-1 ${currentStep >= 3 ? "text-green-600" : "text-gray-500"}`}
            >
              Capture Image
            </Text>
          </View>
        </View> */}

        <ScrollView style={tw`px-2`} showsVerticalScrollIndicator={false}>
          <Text
            style={[
              tw`text-2xl font-extrabold mb-3 text-center`,
              { color: "#7cc0d8" },
            ]}
          >
            {person.name}
          </Text>
          {/* Personal Information - Always Show */}
          <View
            style={[
              tw`border-2 rounded-lg p-4 mb-4`,
              { borderColor: "#7cc0d8" },
            ]}
          >
            <Text
              style={[
                tw`text-lg font-semibold mb-3 text-center`,
                { color: "#7cc0d8" },
              ]}
            >
              Personal Information
            </Text>

            <InfoRow label="Customer ID" value={person.customer_id} />
            {/* <InfoRow label="Name" value={person.customer_name || person.name} /> */}
            <InfoRow label="City" value={person.city || person.address} />
            <InfoRow label="Address" value={person.address} />
            <InfoRow
              label="Phone Number"
              value={person.contact_number1 || person.number}
            />
            <InfoRow label="Nominee Name" value={person.nominee_name} />
            <InfoRow
              label="Nominee Phone"
              value={person.nominee_contact_number}
            />
          </View>

          {/* Status Check Result */}
          {checkingExisting && (
            <View
              style={tw`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 items-center`}
            >
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={tw`text-blue-800 text-sm mt-2`}>
                Checking customer status...
              </Text>
            </View>
          )}

          {isAlreadyVisited && !checkingExisting && (
            <View
              style={tw`bg-green-50 border border-green-200 rounded-lg p-4 mb-4`}
            >
              <View style={tw`flex-row items-center justify-center`}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={tw`text-green-800 text-sm font-semibold ml-2`}>
                  ✓ Already Visited
                </Text>
              </View>
              <Text style={tw`text-green-600 text-xs text-center mt-1`}>
                This customer has already been visited. Viewing existing
                response.
              </Text>
            </View>
          )}

          {/* Customer Response Section - Show for both visited and non-visited */}
          <View
            style={[
              tw`border-2 rounded-lg p-4 mb-4`,
              { borderColor: "#7cc0d8" },
            ]}
          >
            <Text
              style={[
                tw`text-lg font-semibold mb-3 text-center`,
                { color: "#7cc0d8" },
              ]}
            >
              Customer Response
              {isAlreadyVisited && (
                <Text style={tw`text-green-600 text-sm ml-2`}>(Saved)</Text>
              )}
            </Text>

            <View style={tw`mb-3`}>
              <View
                style={[
                  tw`border rounded-lg`,
                  isAlreadyVisited
                    ? tw`bg-gray-100 border-gray-300`
                    : tw`border-gray-300 bg-white`,
                ]}
              >
                <RNPickerSelect
                  onValueChange={handleResponseSelect}
                  value={selectedResponse}
                  placeholder={{ label: "Select response...", value: "" }}
                  items={[
                    { label: "Call not lifting", value: "Call not lifting" },
                    {
                      label: "Customer not at home",
                      value: "Customer not at home",
                    },
                    { label: "Requested time", value: "Requested time" },
                    { label: "Others", value: "Others" },
                  ]}
                  disabled={isAlreadyVisited}
                  style={{
                    inputAndroid: {
                      ...tw`text-sm pl-3 pr-3 py-3`,
                      color: isAlreadyVisited ? "#6b7280" : "#1f2937",
                    },
                    inputIOS: {
                      ...tw`text-sm pl-3 pr-3 py-3`,
                      color: isAlreadyVisited ? "#6b7280" : "#1f2937",
                    },
                    placeholder: {
                      color: "gray",
                    },
                  }}
                />
              </View>
            </View>

            {/* Response Description */}
            <TextInput
              value={responseDescription}
              onChangeText={isAlreadyVisited ? null : setResponseDescription}
              placeholder="Enter response description..."
              multiline
              numberOfLines={3}
              editable={!isAlreadyVisited}
              style={[
                tw`border rounded-lg p-3 text-sm`,
                isAlreadyVisited
                  ? tw`bg-gray-100 border-gray-300 text-gray-600`
                  : tw`border-gray-300 text-gray-800 bg-white`,
              ]}
            />
          </View>

          {/* Captured Image Section - Show for both visited and non-visited */}
          {(capturedImage ||
            (isAlreadyVisited && existingResponse?.image_url)) && (
            <View style={tw`mb-4`}>
              <Text
                style={[
                  tw`text-center text-lg font-semibold mb-2`,
                  { color: "#7cc0d8" },
                ]}
              >
                {isAlreadyVisited
                  ? "Previously Captured Image"
                  : "Captured Image"}
              </Text>

              {__DEV__ && (
                <View style={tw`bg-yellow-100 p-2 rounded mb-2`}>
                  <Text style={tw`text-xs`}>
                    Image URL: {capturedImage.imageUri}
                  </Text>
                  {console.log("Captured Image URI:", capturedImage.imageUri)}
                  <Text style={tw`text-xs`}>Base URL: {BASE_URL}</Text>
                  {console.log("Base URL:", BASE_URL)}
                </View>
              )}

              <TouchableOpacity onPress={() => setImageViewVisible(true)}>
                <View
                  style={[
                    tw`border-2 border-dashed rounded-lg p-4 items-center`,
                    {
                      borderColor: isAlreadyVisited ? "#10b981" : "#10b981",
                      backgroundColor: isAlreadyVisited ? "#f0fdf4" : "#f0fdf4",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      isAlreadyVisited
                        ? "checkmark-done-circle"
                        : "checkmark-circle"
                    }
                    size={24}
                    color="#10b981"
                  />
                  <Text style={tw`text-center text-green-600 text-sm mt-2`}>
                    {isAlreadyVisited
                      ? "Previously Captured Image"
                      : "Image Captured Successfully"}
                  </Text>
                  <Text style={tw`text-center text-gray-500 text-xs mt-1`}>
                    Tap to view image
                  </Text>
                  {uploadedImageUrl && (
                    <Text style={tw`text-center text-blue-500 text-xs mt-1`}>
                      Image {isAlreadyVisited ? "previously " : ""}uploaded to
                      server
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Camera Section - Only show if NOT visited and response is selected */}
          {!isAlreadyVisited && selectedResponse && !capturedImage && (
            <View style={tw`mb-4`}>
              <Text
                style={[
                  tw`text-center text-lg font-semibold mb-2`,
                  { color: "#7cc0d8" },
                ]}
              >
                Capture Image
              </Text>

              <TouchableOpacity
                onPress={() => setCameraVisible(true)}
                style={[
                  tw`border-2 border-dashed rounded-lg p-6 items-center`,
                  { borderColor: "#7cc0d8" },
                ]}
              >
                <Entypo name="camera" size={32} color="#7cc0d8" />
                <Text style={tw`text-center text-blue-600 text-sm mt-2`}>
                  Tap to Capture Image
                </Text>
                <Text style={tw`text-center text-gray-500 text-xs mt-1`}>
                  Required for submission
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Location - Show for both visited and non-visited */}
          {capturedImage?.location && (
            <View style={tw`mb-4`}>
              <Text
                style={[
                  tw`text-center text-lg font-semibold mb-2`,
                  { color: "#7cc0d8" },
                ]}
              >
                {isAlreadyVisited
                  ? "Previously Captured Location"
                  : "Location Captured"}
              </Text>
              <MapWebView
                latitude={capturedImage.location.latitude}
                longitude={capturedImage.location.longitude}
              />
            </View>
          )}

          {/* Spacer for bottom buttons */}
          <View style={tw`mb-32`} />
        </ScrollView>

        {/* Bottom Buttons */}
        <View
          style={tw`absolute bottom-5 left-4 right-4 flex-row justify-between`}
        >
          {/* Close Button */}
          <Pressable
            onPress={onClose}
            style={[
              tw`rounded-full px-8 py-3 flex-1 mr-2`,
              { backgroundColor: "#ef4444" },
            ]}
          >
            <Text style={tw`text-white text-lg font-bold text-center`}>
              Close
            </Text>
          </Pressable>

          {/* Save Button - Only show if not visited and all steps completed */}
          {!isAlreadyVisited && (
            <Pressable
              onPress={handleSave}
              disabled={!isSaveEnabled || saving}
              style={[
                tw`rounded-full px-8 py-3 flex-1 ml-2`,
                {
                  backgroundColor: isSaveEnabled ? "#10b981" : "#9ca3af",
                  opacity: isSaveEnabled ? 1 : 0.6,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={tw`text-white text-lg font-bold text-center`}>
                  {isSaveEnabled ? "Save Response" : "Complete Steps"}
                </Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Modals */}
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

        <Modal visible={cameraVisible} animationType="slide">
          <CameraComponent
            onCapture={handleCapture}
            onClose={() => setCameraVisible(false)}
          />
        </Modal>

        {/* Image Viewing Modal - Updated to handle both visited and non-visited images */}
        <ImageViewing
          images={[{ uri: capturedImage?.imageUri }]}
          imageIndex={0}
          visible={imageViewVisible}
          onRequestClose={() => setImageViewVisible(false)}
        />
      </View>
    </Animated.View>
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

export default DetailedCust;

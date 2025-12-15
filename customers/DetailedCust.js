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
  const [currentStep, setCurrentStep] = useState(1);
  const [imageError, setImageError] = useState(false);

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
    setImageError(false);
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

      const response = await fetch(
        `${BASE_URL}/api/get-existing-responses/${customerId}`,
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

        if (result.success) {
          const existingResponses = result.existingResponses || {};
          const hasExistingResponses =
            Object.keys(existingResponses).length > 0;

          if (hasExistingResponses) {
            setIsAlreadyVisited(true);

            const firstPtNo = Object.keys(existingResponses)[0];
            const existingResponse = existingResponses[firstPtNo];

            setExistingResponse(existingResponse);

            if (existingResponse) {
              const responseText =
                existingResponse.response_type ||
                existingResponse.response_text ||
                "";

              const validResponses = [
                "Call not lifting",
                "1111111111111111",
                "Customer not at home",
                "Requested time",
                "Others",
              ];

              if (validResponses.includes(responseText)) {
                setSelectedResponse(responseText);
              } else if (responseText) {
                setSelectedResponse("Others");
              } else {
                setSelectedResponse("");
              }

              const description = existingResponse.response_description || "";
              setResponseDescription(description);

              const imageUrl = existingResponse.image_url;

              if (imageUrl) {
                const fullImageUrl = imageUrl.startsWith("http")
                  ? imageUrl
                  : `${BASE_URL}${imageUrl}`;

                setCapturedImage({
                  imageUri: fullImageUrl,
                  location:
                    existingResponse.latitude && existingResponse.longitude
                      ? {
                          latitude: existingResponse.latitude,
                          longitude: existingResponse.longitude,
                        }
                      : null,
                });
                setUploadedImageUrl(imageUrl);
              } else {
                setCapturedImage(null);
                setUploadedImageUrl(null);
                console.log("No image URL found");
              }
            }
            setCurrentStep(1);
          } else {
            setIsAlreadyVisited(false);
            setCurrentStep(2);
          }
        } else {
          console.log("API returned success: false");
          Alert.alert("Error", "Failed to check customer status");
        }
      } else {
        const errorText = await response.text();
        console.log("Error response:", errorText);
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

  // STEP 2: Handle response selection
  const handleResponseSelect = (value) => {
    setSelectedResponse(value);
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

    console.log("Image captured successfully:", data);

    // Validate the captured data
    if (!data || !data.imageUri) {
      console.error("Invalid image data received:", data);
      Alert.alert("Error", "Failed to capture image. Please try again.");
      return;
    }

    // Set the captured image
    setCapturedImage(data);
    setCameraVisible(false);
    setImageError(false);

    console.log("Camera closed, image set successfully");
  };

  // Safe image URI getter
  const getSafeImageUri = () => {
    if (!capturedImage || !capturedImage.imageUri) {
      return null;
    }

    try {
      // Validate the URI
      const uri = capturedImage.imageUri;
      if (typeof uri === "string" && uri.length > 0) {
        return uri;
      }
      return null;
    } catch (error) {
      console.error("Error getting safe image URI:", error);
      return null;
    }
  };

  // Handle image viewing safely
  const handleImageView = () => {
    const safeUri = getSafeImageUri();
    if (safeUri) {
      setImageViewVisible(true);
    } else {
      Alert.alert("Error", "No valid image to display");
    }
  };

  // Upload image to server
  const uploadImageToServer = async (imageUri) => {
    try {
      console.log("Uploading image:", imageUri);

      // Validate image URI
      if (!imageUri || typeof imageUri !== "string") {
        throw new Error("Invalid image URI");
      }

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

      let imageUrl = uploadedImageUrl;
      if (capturedImage && !capturedImage.imageUri.startsWith("http")) {
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
      }

      let finalResponseDescription = responseDescription;

      if (selectedResponse === "Others") {
        finalResponseDescription = responseDescription;
      } else {
        finalResponseDescription = responseDescription || "";
      }

      const responseData = {
        customer_id: person.customer_id || person.entry_id,
        response_type: selectedResponse,
        response_description: finalResponseDescription,
        image_url: imageUrl,
        latitude: capturedImage?.location?.latitude || null,
        longitude: capturedImage?.location?.longitude || null,
      };

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
        console.log("Response saved/updated successfully:", result);

        setIsAlreadyVisited(true);
        setExistingResponse({
          response_text: selectedResponse,
          response_description: finalResponseDescription,
          image_url: imageUrl,
          latitude: capturedImage?.location?.latitude,
          longitude: capturedImage?.location?.longitude,
        });

        if (onResponseSaved) {
          onResponseSaved(person.customer_id || person.entry_id);
        }

        Alert.alert(
          "Success",
          `Response ${existingResponse ? "updated" : "saved"} successfully for ${result.pt_count} loan account(s)!`,
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

      setTimeout(() => {
        setModalVisible(true);
      }, 100);
    } catch (error) {
      console.error("Error in handleViewDetails:", error);
      const customerData = {
        customerInfo: person,
        allPTs: [person],
      };
      setSelectedPerson(customerData);
      setTimeout(() => {
        setModalVisible(true);
      }, 100);
    } finally {
      setLoadingRelated(false);
    }
  };

  const isSaveEnabled =
    selectedResponse &&
    capturedImage &&
    (selectedResponse !== "Others" || responseDescription.trim());

  const handleSave = () => {
    if (!selectedResponse || !capturedImage) {
      Alert.alert(
        "Incomplete Data",
        "Please complete all required steps before saving."
      );
      return;
    }

    const actionText = isAlreadyVisited ? "update" : "save";

    Alert.alert(
      `Confirm ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
      `This response will be ${actionText}d for all loan accounts of this customer. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionText.charAt(0).toUpperCase() + actionText.slice(1),
          onPress: saveResponseToDatabase,
        },
      ]
    );
  };

  const handleImageError = () => {
    console.log("Image failed to load");
    setImageError(true);
  };

  if (!person) return null;

  const safeImageUri = getSafeImageUri();
  const imageViewImages = safeImageUri ? [{ uri: safeImageUri }] : [];

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
        <View style={tw`flex flex-row justify-end mb-4`}>

          {/* Close Button (X) in top right */}
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <ScrollView style={tw`px-2`} showsVerticalScrollIndicator={false}>
          <Text
            style={[
              tw`text-2xl font-extrabold mb-3 text-center`,
              { color: "#7cc0d8" },
            ]}
          >
            {person.name}
          </Text>

          {/* Personal Information */}
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

          {/* Customer Response Section */}
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
              {isAlreadyVisited && existingResponse && (
                <Text style={tw`text-green-600 text-sm ml-2`}>
                  (Saved - You can update)
                </Text>
              )}
            </Text>

            <View style={tw`mb-3`}>
              <View
                style={[tw`border rounded-lg`, tw`border-gray-300 bg-white`]}
              >
                <RNPickerSelect
                  onValueChange={handleResponseSelect}
                  value={selectedResponse}
                  placeholder={{ label: "Select response...", value: "" }}
                  items={[
                    { label: "Call not lifting", value: "Call not lifting" },
                    { label: "1111111111111111", value: "1111111111111111" },
                    {
                      label: "Customer not at home",
                      value: "Customer not at home",
                    },
                    { label: "Requested time", value: "Requested time" },
                    { label: "Others", value: "Others" },
                  ]}
                  style={{
                    inputAndroid: {
                      ...tw`text-sm pl-3 pr-3 py-3`,
                      color: "#1f2937",
                    },
                    inputIOS: {
                      ...tw`text-sm pl-3 pr-3 py-3`,
                      color: "#1f2937",
                    },
                    placeholder: {
                      color: "gray",
                    },
                  }}
                />
              </View>
            </View>

            <TextInput
              value={responseDescription}
              onChangeText={setResponseDescription}
              placeholder="Enter response description..."
              multiline
              numberOfLines={3}
              style={tw`border border-gray-300 rounded-lg p-3 text-sm text-gray-800 bg-white`}
            />
          </View>

          {/* Captured Image Section */}
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

              <TouchableOpacity onPress={handleImageView}>
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
                  {imageError && (
                    <Text style={tw`text-center text-red-500 text-xs mt-1`}>
                      Failed to load image
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Camera Section */}
          {!isAlreadyVisited && selectedResponse && (
            <View style={tw`mb-4`}>
              {!capturedImage ? (
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
              ) : null}
            </View>
          )}

          {/* Location */}
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

          <View style={tw`mb-32`} />
        </ScrollView>

        <View
          style={tw`absolute bottom-5 left-4 right-4 flex-row justify-between`}
        >
          <Pressable
            onPress={handleViewDetails}
            disabled={loadingRelated}
            style={[
              tw`rounded-full px-8 py-3 flex-1 mr-2`,
              {
                backgroundColor: loadingRelated ? "#9ca3af" : "#7cc0d8",
                opacity: loadingRelated ? 0.6 : 1,
              },
            ]}
          >
            {loadingRelated ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={tw`text-white text-lg font-bold text-center`}>
                View All Loans
              </Text>
            )}
          </Pressable>

          {!isAlreadyVisited ? (
            <Pressable
              onPress={handleSave}
              disabled={!isSaveEnabled || saving}
              style={[
                tw`rounded-full px-3 py-3 flex-1 ml-2`,
                {
                  backgroundColor: isSaveEnabled ? "#10b981" : "#9ca3af",
                  opacity: isSaveEnabled ? 1 : 0.6,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : isSaveEnabled ? (
                <Text style={tw`text-white text-lg font-bold text-center`}>
                  Save
                </Text>
              ) : (
                <Text style={tw`text-white text-base font-bold text-center`}>
                  Complete Steps
                </Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSave}
              disabled={!isSaveEnabled || saving}
              style={[
                tw`rounded-full px-3 py-3 flex-1 ml-2`,
                {
                  backgroundColor: isSaveEnabled ? "#f59e0b" : "#9ca3af",
                  opacity: isSaveEnabled ? 1 : 0.6,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : isSaveEnabled ? (
                <Text style={tw`text-white text-lg font-bold text-center`}>
                  Update
                </Text>
              ) : (
                <Text style={tw`text-white text-base font-bold text-center`}>
                  Complete Steps
                </Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Modals */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          {selectedPerson && (
            <CustRelated
              person={selectedPerson}
              onClose={() => setModalVisible(false)}
            />
          )}
        </Modal>

        <Modal visible={cameraVisible} animationType="slide">
          <CameraComponent
            onCapture={handleCapture}
            onClose={() => setCameraVisible(false)}
          />
        </Modal>

        {/* Image Viewing Modal */}
        <ImageViewing
          images={imageViewImages}
          imageIndex={0}
          visible={imageViewVisible}
          onRequestClose={() => setImageViewVisible(false)}
          onImageIndexChange={() => setImageError(false)}
          onImageLoad={() => setImageError(false)}
          onImageLoadError={handleImageError}
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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Dimensions,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'tailwind-react-native-classnames';

const { width, height } = Dimensions.get('window');

const PreviousResponsesList = ({ 
  visible, 
  onClose, 
  customerId, 
  token, 
  BASE_URL,
  customerName 
}) => {
  const [previousResponses, setPreviousResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    if (visible && customerId) {
      loadPreviousResponses();
    }
  }, [visible, customerId]);

  const loadPreviousResponses = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BASE_URL}/api/get-all-previous-responses/${customerId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPreviousResponses(result.previousResponses || []);
        }
      }
    } catch (error) {
      console.error('Error loading previous responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleResponsePress = (response) => {
    setSelectedResponse(response);
    setDetailModalVisible(true);
  };

  const renderResponseItem = ({ item, index }) => (
    <TouchableOpacity
      style={[
        tw`p-4 border-b border-gray-200`,
        item.is_current_agent && tw`bg-blue-50`
      ]}
      onPress={() => handleResponsePress(item)}
    >
      <View style={tw`flex-row justify-between items-start mb-2`}>
        <View style={tw`flex-1`}>
          <Text style={tw`font-bold text-gray-800`}>
            {item.agent_name || item.agent_full_name || 'Unknown Agent'}
            {item.is_current_agent && (
              <Text style={tw`text-blue-600 text-xs`}> (You)</Text>
            )}
          </Text>
          <Text style={tw`text-sm text-gray-600 mt-1`}>
            PT: {item.pt_no || 'N/A'}
          </Text>
          <Text style={[
            tw`text-sm font-medium mt-1`,
            item.response_text === 'Others' ? tw`text-purple-600` : tw`text-green-600`
          ]}>
            {item.response_text === 'Others' 
              ? (item.response_description || 'Other') 
              : item.response_text}
          </Text>
        </View>
        <View style={tw`items-end`}>
          <Text style={tw`text-xs text-gray-500`}>
            {formatDate(item.response_timestamp)}
          </Text>
          {item.image_url && (
            <Ionicons name="camera" size={16} color="#6b7280" style={tw`mt-1`} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDetailModal = () => (
    <Modal
      visible={detailModalVisible}
      animationType="slide"
      onRequestClose={() => setDetailModalVisible(false)}
    >
      <View style={tw`flex-1 bg-white`}>
        {/* Header */}
        <View style={tw`px-4 py-3 border-b border-gray-200 flex-row justify-between items-center`}>
          <Text style={tw`text-lg font-bold text-gray-800`}>Response Details</Text>
          <TouchableOpacity
            onPress={() => setDetailModalVisible(false)}
            style={tw`p-2`}
          >
            <Ionicons name="close" size={24} color="#4b5563" />
          </TouchableOpacity>
        </View>

        {selectedResponse && (
          <ScrollView style={tw`flex-1 p-4`}>
            {/* Agent Info */}
            <View style={tw`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4`}>
              <Text style={tw`font-bold text-blue-800 text-lg`}>
                {selectedResponse.agent_name || selectedResponse.agent_full_name || 'Unknown Agent'}
                {selectedResponse.is_current_agent && (
                  <Text style={tw`text-blue-600`}> (You)</Text>
                )}
              </Text>
              <Text style={tw`text-blue-700 text-sm mt-1`}>
                PT: {selectedResponse.pt_no || 'N/A'}
              </Text>
            </View>

            {/* Visit Date */}
            <View style={tw`mb-4`}>
              <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>Visit Date & Time:</Text>
              <Text style={tw`text-gray-600`}>
                {formatDate(selectedResponse.response_timestamp)}
              </Text>
            </View>

            {/* Response */}
            <View style={tw`mb-4`}>
              <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>Response:</Text>
              <View style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3`}>
                <Text style={tw`text-gray-800 font-medium`}>
                  {selectedResponse.response_text}
                </Text>
              </View>
            </View>

            {/* Description */}
            {selectedResponse.response_description && (
              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>Description:</Text>
                <View style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3`}>
                  <Text style={tw`text-gray-800`}>
                    {selectedResponse.response_description}
                  </Text>
                </View>
              </View>
            )}

            {/* Image */}
            {selectedResponse.image_url && (
              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>Visit Image:</Text>
                <Image
                  source={{ uri: `${BASE_URL}${selectedResponse.image_url}` }}
                  style={[
                    tw`rounded-lg self-center`,
                    { width: width - 32, height: 300, resizeMode: 'cover' }
                  ]}
                  defaultSource={require('../assets/jewel.webp')}
                />
              </View>
            )}

            {/* Location */}
            {(selectedResponse.latitude && selectedResponse.longitude) && (
              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>Location:</Text>
                <Text style={tw`text-gray-600 text-sm`}>
                  Latitude: {selectedResponse.latitude}, Longitude: {selectedResponse.longitude}
                </Text>
              </View>
            )}

            {/* Additional Info */}
            <View style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3`}>
              <Text style={tw`text-xs text-gray-600 text-center`}>
                Recorded via {selectedResponse.device_id || 'Mobile App'}
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Close Button */}
        <View style={tw`p-4 border-t border-gray-200`}>
          <Pressable
            onPress={() => setDetailModalVisible(false)}
            style={[tw`rounded-full px-6 py-3`, { backgroundColor: '#7cc0d8' }]}
          >
            <Text style={tw`text-white text-lg font-bold text-center`}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-white`}>
        {/* Header */}
        <View style={tw`px-4 py-3 border-b border-gray-200 flex-row justify-between items-center`}>
          <View>
            <Text style={tw`text-lg font-bold text-gray-800`}>Previous Visits</Text>
            <Text style={tw`text-sm text-gray-600`}>{customerName}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={tw`p-2`}
          >
            <Ionicons name="close" size={24} color="#4b5563" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={tw`px-4 py-3 bg-gray-50 border-b border-gray-200`}>
          <Text style={tw`text-sm text-gray-700`}>
            Total {previousResponses.length} visit{previousResponses.length !== 1 ? 's' : ''} recorded
          </Text>
        </View>

        {/* List */}
        {loading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <Text style={tw`text-gray-600`}>Loading previous visits...</Text>
          </View>
        ) : previousResponses.length > 0 ? (
          <FlatList
            data={previousResponses}
            renderItem={renderResponseItem}
            keyExtractor={(item, index) => `response-${item.entry_id}-${index}`}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={tw`flex-1 justify-center items-center p-4`}>
            <Ionicons name="time-outline" size={50} color="#9ca3af" />
            <Text style={tw`text-lg text-gray-500 text-center mt-2`}>
              No previous visits found
            </Text>
            <Text style={tw`text-sm text-gray-400 text-center mt-1`}>
              Visit responses will appear here after they are saved
            </Text>
          </View>
        )}

        {/* Detail Modal */}
        {renderDetailModal()}
      </View>
    </Modal>
  );
};

export default PreviousResponsesList;
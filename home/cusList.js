// components/CusList.js
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import tw from 'tailwind-react-native-classnames';
import { Ionicons } from "@expo/vector-icons";

const CusList = () => {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Secure configuration - consider moving to environment variables
  const SERVER_IP = '192.168.65.11';
  const BASE_URL = `http://${SERVER_IP}:3000/api`;
  const DISPLAY_LIMIT = 5;
  const REQUEST_TIMEOUT = 10000;

  // Secure fetch wrapper with timeout and error handling
  const secureFetch = async (endpoint, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your connection.');
      }
      
      throw error;
    }
  };

  // Fetch customers using secure fetch
  const fetchCustomers = async () => {
    try {
      // Input validation
      if (!token) {
        throw new Error('Authentication token is missing');
      }

      if (!user?.username) {
        throw new Error('User information is incomplete');
      }

      setLoading(true);
      setError(null);
      
      console.log('Fetching customers for agent:', user.username);
      
      const data = await secureFetch('/customers');
      
      // Response validation
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from server');
      }

      if (data.success) {
        // Data sanitization - ensure we have an array
        const customers = Array.isArray(data.customers) ? data.customers : [];
        
        // Additional data validation
        const validatedCustomers = customers.map(customer => ({
          entry_id: customer.entry_id || '',
          customer_name: customer.customer_name || 'N/A',
          contact_number1: customer.contact_number1 || 'N/A',
          address: customer.address || 'N/A',
          visited: customer.visited || false,
        }));
        
        setAllCustomers(validatedCustomers);
        console.log(`Fetched ${validatedCustomers.length} customers`);
      } else {
        const errorMsg = data.message || 'Failed to fetch customers';
        setError(errorMsg);
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      
      // Secure error handling - don't expose sensitive information
      let errorMessage = 'Network error. Please try again.';
      
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (error.message.includes('Authentication')) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.message.includes('HTTP error')) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchCustomers();
    }
  }, [token, user]);

  const handleViewMore = () => {
    navigation.navigate('Customers', { 
      customers: allCustomers,
      agentName: user?.username,
      preloaded: true
    });
  };

  const handleRefresh = () => {
    fetchCustomers();
  };

  const handleCall = (phoneNumber) => {
    if (phoneNumber && phoneNumber !== 'N/A') {
      const phoneUrl = `tel:${phoneNumber}`;
      Linking.openURL(phoneUrl).catch(err => {
        Alert.alert('Error', 'Could not make phone call');
        console.error('Error opening phone app:', err);
      });
    } else {
      Alert.alert('Error', 'Phone number not available');
    }
  };

  // Get only first 5 customers for display
  const displayedCustomers = allCustomers.slice(0, DISPLAY_LIMIT);

  if (loading) {
    return (
      <View style={[tw`bg-white p-3 m-2 rounded-xl border`, { borderColor: '#7cc0d8' }]}>
        <Text style={tw`text-base font-bold mb-3`}>
          Customer List - {user?.username}
        </Text>
        <View style={tw`items-center p-3`}>
          <ActivityIndicator size="small" color="#7cc0d8" />
          <Text style={tw`text-gray-600 text-xs mt-1`}>
            Loading your customers...
          </Text>
        </View>
      </View>
    );
  }

  if (error && allCustomers.length === 0) {
    return (
      <View style={tw`bg-white p-3 m-2 rounded-xl border border-red-400`}>
        <Text style={tw`text-base font-bold mb-3`}>
          Customer List - {user?.username}
        </Text>
        <View style={tw`items-center p-3`}>
          <Text style={tw`text-gray-600 text-xs text-center mb-3`}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchCustomers}
            style={[tw`px-3 py-1 rounded-lg`, { backgroundColor: '#7cc0d8' }]}
          >
            <Text style={tw`text-white font-semibold text-xs`}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[tw`bg-white p-3 m-2 rounded-xl border`, { borderColor: '#7cc0d8' }]}>
      {/* Header */}
      <View style={tw`flex-row justify-between items-center mb-3`}>
        <View>
          <Text style={tw`text-base font-bold`}>
            Your Customers
          </Text>
          <Text style={tw`text-gray-600 text-xs`}>
            Showing {displayedCustomers.length} of {allCustomers.length}
          </Text>
        </View>
        <TouchableOpacity onPress={handleRefresh}>
          <Text style={[tw`font-semibold text-xs`, { color: '#7cc0d8' }]}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Customer List */}
      {displayedCustomers.length === 0 ? (
        <View style={tw`items-center p-3`}>
          <Text style={tw`text-gray-600 text-xs`}>
            No customers assigned to you yet
          </Text>
        </View>
      ) : (
        <>
          {/* Customer Cards */}
          {displayedCustomers.map((customer) => (
            <View
              key={customer.entry_id}
              style={[
                tw`p-2 rounded-lg mb-2 border`,
                customer.visited 
                  ? { backgroundColor: '#f0f9f0', borderLeftColor: '#10b981', borderLeftWidth: 7 }
                  : { backgroundColor: '#fef2f2', borderLeftColor: '#ef4444', borderLeftWidth: 7 }
              ]}
            >
              <View style={tw`flex-row justify-between items-start`}>
                <View style={tw`flex-1 mr-2`}>
                  <Text style={tw`text-sm font-bold text-gray-800`}>
                    {customer.customer_name}
                  </Text>
                  <View style={tw`flex-row items-center mt-1`}>
                    <TouchableOpacity 
                      onPress={() => handleCall(customer.contact_number1)}
                      style={tw`flex-row items-center`}
                    >
                      <Ionicons name="call" size={12} color="#3b82f6" />
                      <Text style={tw`text-xs text-blue-500 ml-1`}>
                        {customer.contact_number1}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={tw`flex-row items-center mt-1`}>
                    <Ionicons name="location" size={10} color="#6b7280" />
                    <Text style={tw`text-xs text-gray-500 ml-1`}>
                      {customer.address}
                    </Text>
                  </View>
                </View>
                <View style={[
                  tw`px-2 py-1 rounded-full`,
                  customer.visited 
                    ? { backgroundColor: '#d1fae5' }
                    : { backgroundColor: '#fee2e2' }
                ]}>
                  <Text style={[
                    tw`text-xs font-semibold`,
                    customer.visited 
                      ? { color: '#065f46' }
                      : { color: '#991b1b' }
                  ]}>
                    {customer.visited ? 'Visited' : 'Pending'}
                  </Text>
                </View>
              </View>
              
              {/* Visited status at bottom */}
              {customer.visited && (
                <View style={tw`flex-row items-center mt-2 pt-1 border-t border-gray-200`}>
                  <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                  <Text style={tw`text-xs text-green-700 ml-1`}>
                    Already visited
                  </Text>
                </View>
              )}
            </View>
          ))}

          {/* View More Footer */}
          {allCustomers.length > DISPLAY_LIMIT && (
            <TouchableOpacity 
              onPress={handleViewMore}
              style={tw`mt-1`}
            >
              <Text style={[tw`text-center font-bold p-1 text-xs`, { color: '#7cc0d8' }]}>
                View all {allCustomers.length} customers...
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

export default CusList;
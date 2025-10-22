// components/CusList.js
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import tw from 'tailwind-react-native-classnames';
import axios from 'axios';

const CusList = () => {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const SERVER_IP = '192.168.65.11';
  const BASE_URL = `http://${SERVER_IP}:3000/api`;
  const DISPLAY_LIMIT = 5;

  // Create axios instance for this component
  const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  // Fetch customers using axios
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching customers for agent:', user?.username);
      
      const response = await api.get('/customers');
      const data = response.data;
      
      if (data.success) {
        setAllCustomers(data.customers);
        console.log(`Fetched ${data.customers.length} customers`);
      } else {
        setError(data.message || 'Failed to fetch customers');
        Alert.alert('Error', data.message || 'Failed to load customer data');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      const errorMessage = error.response?.data?.message || 'Network error. Please try again....';
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
      agentName: user?.username 
    });
  };

  const handleRefresh = () => {
    fetchCustomers();
  };

  // Get only first 5 customers for display
  const displayedCustomers = allCustomers.slice(0, DISPLAY_LIMIT);

  if (loading) {
    return (
      <View style={[tw`bg-white p-4 m-2 rounded-xl border`, { borderColor: '#7cc0d8' }]}>
        <Text style={tw`text-lg font-bold mb-4`}>
          Customer List - {user?.username}
        </Text>
        <View style={tw`items-center p-4`}>
          <ActivityIndicator size="small" color="#7cc0d8" />
          <Text style={tw`text-gray-600 text-sm mt-2`}>
            Loading your customers...
          </Text>
        </View>
      </View>
    );
  }

  if (error && allCustomers.length === 0) {
    return (
      <View style={tw`bg-white p-4 m-2 rounded-xl border border-red-400`}>
        <Text style={tw`text-lg font-bold mb-4`}>
          Customer List - {user?.username}
        </Text>
        <View style={tw`items-center p-4`}>
          <Text style={tw`text-gray-600 text-sm text-center mb-4`}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchCustomers}
            style={[tw`px-4 py-2 rounded-lg`, { backgroundColor: '#7cc0d8' }]}
          >
            <Text style={tw`text-white font-semibold`}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[tw`bg-white p-4 m-2 rounded-xl border`, { borderColor: '#7cc0d8' }]}>
      {/* Header */}
      <View style={tw`flex-row justify-between items-center mb-4`}>
        <View>
          <Text style={tw`text-lg font-bold`}>
            Your Customers
          </Text>
          <Text style={tw`text-gray-600 text-sm`}>
            Agent: {user?.username} | Showing {displayedCustomers.length} of {allCustomers.length}
          </Text>
        </View>
        <TouchableOpacity onPress={handleRefresh}>
          <Text style={[tw`font-semibold`, { color: '#7cc0d8' }]}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Customer List */}
      {displayedCustomers.length === 0 ? (
        <View style={tw`items-center p-4`}>
          <Text style={tw`text-gray-600 text-sm`}>
            No customers assigned to you yet
          </Text>
        </View>
      ) : (
        <>
          {/* Table Headers */}
          <View style={tw`flex-row justify-between mb-2 px-2`}>
            <Text style={tw`text-sm font-semibold flex-1`}>Name</Text>
            <Text style={tw`text-sm font-semibold flex-1 text-center`}>Mobile</Text>
            <Text style={tw`text-sm font-semibold flex-1 text-right`}>City</Text>
          </View>

          {/* Customer Rows */}
          {displayedCustomers.map((customer) => (
            <View
              key={customer.entry_id}
              style={tw`flex-row justify-between items-center p-2 border-b border-gray-200`}
            >
              <Text style={tw`text-sm text-gray-800 flex-1`}>
                {customer.customer_name || 'N/A'}
              </Text>
              <Text style={tw`text-sm text-gray-600 flex-1 text-center`}>
                {customer.contact_number1 || 'N/A'}
              </Text>
              <Text style={tw`text-sm text-gray-500 flex-1 text-right`}>
                {customer.address || 'N/A'}
              </Text>
            </View>
          ))}

          {/* View More Footer */}
          {allCustomers.length > DISPLAY_LIMIT && (
            <TouchableOpacity onPress={handleViewMore}>
              <Text style={[tw`text-right font-bold p-2 text-sm`, { color: '#7cc0d8' }]}>
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
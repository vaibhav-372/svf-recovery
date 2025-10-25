// components/CusList.js
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Linking,
  Modal 
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import tw from 'tailwind-react-native-classnames';
import { Ionicons } from "@expo/vector-icons";
import DetailedCust from '../customers/DetailedCust';

const CusList = () => {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const SERVER_IP = '192.168.65.11';
  const BASE_URL = `http://${SERVER_IP}:3000/api`;
  const DISPLAY_LIMIT = 5;

  // Enhanced visited status parser
  const parseVisitedStatus = (isVisited, visited) => {
    console.log('Parsing visited status:', { isVisited, visited, typeIsVisited: typeof isVisited, typeVisited: typeof visited });
    
    // Handle isVisited field first
    if (isVisited === true || isVisited === 1 || isVisited === '1' || isVisited === 'true') {
      return 1;
    }
    if (isVisited === false || isVisited === 0 || isVisited === '0' || isVisited === 'false') {
      return 0;
    }
    
    // Fallback to visited field
    if (visited === true || visited === 1 || visited === '1' || visited === 'true') {
      return 1;
    }
    if (visited === false || visited === 0 || visited === '0' || visited === 'false') {
      return 0;
    }
    
    // If we can't determine, assume not visited
    return 0;
  };

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      if (!token || !user?.username) {
        throw new Error('Authentication required');
      }

      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching customers for agent:', user.username);
      
      const response = await fetch(`${BASE_URL}/customers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const customers = Array.isArray(data.customers) ? data.customers : [];
        
        console.log(`📥 Raw API response: ${customers.length} customers received`);
        
        // Process and validate customers with detailed logging
        const validatedCustomers = customers.map((customer, index) => {
          const visitedStatus = parseVisitedStatus(customer.isVisited, customer.visited);
          
          // Log first 3 customers for debugging
          if (index < 3) {
            console.log('🔍 Sample customer visited analysis:', {
              name: customer.customer_name,
              rawIsVisited: customer.isVisited,
              rawVisited: customer.visited,
              parsedStatus: visitedStatus,
              typeIsVisited: typeof customer.isVisited,
              typeVisited: typeof customer.visited
            });
          }

          return {
            id: customer.entry_id || `cust-${index}-${Date.now()}`,
            customer_id: customer.customer_id || customer.entry_id,
            customer_name: customer.customer_name || 'N/A',
            contact_number1: customer.contact_number1 || 'N/A',
            address: customer.address || 'N/A',
            isVisited: visitedStatus,
            contact_number2: customer.contact_number2 || 'N/A',
            nominee_name: customer.nominee_name || 'N/A',
            nominee_contact_number: customer.nominee_contact_number || 'N/A',
            pt_no: customer.pt_no || 'N/A',
            name: customer.customer_name || 'N/A',
            number: customer.contact_number1 || 'N/A',
            city: customer.address || 'N/A',
            // Include raw fields for debugging
            _rawIsVisited: customer.isVisited,
            _rawVisited: customer.visited,
            ...customer
          };
        });
        
        setAllCustomers(validatedCustomers);
        
        // Detailed analytics
        const visitedCount = validatedCustomers.filter(c => c.isVisited === 1).length;
        const nonVisitedCount = validatedCustomers.filter(c => c.isVisited === 0).length;
        
        console.log('📊 Customer Analysis:');
        console.log(`   Total: ${validatedCustomers.length}`);
        console.log(`   Visited: ${visitedCount}`);
        console.log(`   Non-visited: ${nonVisitedCount}`);
        console.log(`   Expected to show: ${nonVisitedCount} non-visited customers`);
        
        // Log all customers with their visited status for debugging
        validatedCustomers.forEach(customer => {
          console.log(`   👤 ${customer.customer_name} - isVisited: ${customer.isVisited} (raw: ${customer._rawIsVisited})`);
        });
        
      } else {
        throw new Error(data.message || 'Failed to fetch customers');
      }
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchCustomers();
    }
  }, [token, user]);

  // STRICT FILTER: Only show customers with isVisited === 0
  const nonVisitedCustomers = allCustomers.filter(customer => {
    const isNotVisited = customer.isVisited === 0;
    
    if (!isNotVisited) {
      console.log(`🚫 Filtered out visited customer: ${customer.customer_name} (isVisited: ${customer.isVisited})`);
    }
    
    return isNotVisited;
  });

  console.log(`🎯 Final non-visited count: ${nonVisitedCustomers.length}/${allCustomers.length}`);

  const handleCardPress = (customer) => {
    console.log("👉 Customer selected:", customer.customer_name);
    setSelectedPerson(customer);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedPerson(null);
    // Refresh the list after modal closes to reflect any changes
    fetchCustomers();
  };

  const handleViewMore = () => {
    navigation.navigate('Customers', { 
      customers: nonVisitedCustomers,
      agentName: user?.username,
      preloaded: true
    });
  };

  const handleRefresh = () => {
    fetchCustomers();
  };

  const handleCall = (phoneNumber) => {
    if (phoneNumber && phoneNumber !== 'N/A') {
      Linking.openURL(`tel:${phoneNumber}`).catch(err => {
        Alert.alert('Error', 'Could not make phone call');
      });
    } else {
      Alert.alert('Error', 'Phone number not available');
    }
  };

  const handleResponseSaved = (customerId) => {
    console.log("✅ Response saved for customer:", customerId);
    
    // Update local state immediately
    setAllCustomers(prevCustomers => 
      prevCustomers.map(customer => 
        customer.customer_id === customerId || customer.id === customerId
          ? { ...customer, isVisited: 1 }
          : customer
      )
    );
    
    setModalVisible(false);
    setSelectedPerson(null);
    
    Alert.alert("Success", "Response saved successfully!");
  };

  const displayedCustomers = nonVisitedCustomers.slice(0, DISPLAY_LIMIT);

  // Loading state
  if (loading) {
    return (
      <View style={[tw`bg-white p-3 m-2 rounded-xl border`, { borderColor: '#7cc0d8' }]}>
        <Text style={tw`text-base font-bold mb-3`}>
          Pending Customers - {user?.username}
        </Text>
        <View style={tw`items-center p-3`}>
          <ActivityIndicator size="small" color="#7cc0d8" />
          <Text style={tw`text-gray-600 text-xs mt-1`}>Loading customers...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && allCustomers.length === 0) {
    return (
      <View style={tw`bg-white p-3 m-2 rounded-xl border border-red-400`}>
        <Text style={tw`text-base font-bold mb-3`}>
          Pending Customers - {user?.username}
        </Text>
        <View style={tw`items-center p-3`}>
          <Text style={tw`text-gray-600 text-xs text-center mb-3`}>{error}</Text>
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
          <Text style={tw`text-base font-bold`}>Pending Customers</Text>
          <Text style={tw`text-gray-600 text-xs`}>
            {nonVisitedCustomers.length} pending • {allCustomers.length - nonVisitedCustomers.length} visited
          </Text>
        </View>
        <TouchableOpacity onPress={handleRefresh}>
          <Text style={[tw`font-semibold text-xs`, { color: '#7cc0d8' }]}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Customer List */}
      {displayedCustomers.length === 0 ? (
        <View style={tw`items-center p-3`}>
          <Ionicons name="checkmark-done-circle" size={32} color="#10b981" />
          <Text style={tw`text-gray-600 text-xs mt-2 text-center`}>
            {allCustomers.length === 0 
              ? "No customers assigned to you yet" 
              : "All customers have been visited! 🎉"
            }
          </Text>
          {allCustomers.length > 0 && (
            <Text style={tw`text-gray-500 text-xs mt-1 text-center`}>
              Great job! You've completed all your visits.
            </Text>
          )}
        </View>
      ) : (
        <>
          {displayedCustomers.map((customer) => (
            <TouchableOpacity
              key={customer.id}
              onPress={() => handleCardPress(customer)}
              style={[
                tw`p-3 rounded-lg mb-2 border`,
                { 
                  backgroundColor: '#fef2f2', 
                  borderLeftColor: '#ef4444', 
                  borderLeftWidth: 7 
                }
              ]}
              activeOpacity={0.7}
            >
              <View style={tw`flex-row justify-between items-start`}>
                <View style={tw`flex-1 mr-2`}>
                  <Text style={tw`text-sm font-bold text-gray-800`}>
                    {customer.customer_name}
                  </Text>
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCall(customer.contact_number1);
                    }}
                    style={tw`flex-row items-center mt-1`}
                  >
                    <Ionicons name="call" size={12} color="#3b82f6" />
                    <Text style={tw`text-xs text-blue-500 ml-1`}>
                      {customer.contact_number1}
                    </Text>
                  </TouchableOpacity>
                  <View style={tw`flex-row items-center mt-1`}>
                    <Ionicons name="location" size={10} color="#6b7280" />
                    <Text style={tw`text-xs text-gray-500 ml-1`}>
                      {customer.address}
                    </Text>
                  </View>
                </View>
                <View style={[tw`px-2 py-1 rounded-full`, { backgroundColor: '#fee2e2' }]}>
                  <Text style={[tw`text-xs font-semibold`, { color: '#991b1b' }]}>
                    Pending
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {nonVisitedCustomers.length > DISPLAY_LIMIT && (
            <TouchableOpacity onPress={handleViewMore} style={tw`mt-1`}>
              <Text style={[tw`text-center font-bold p-1 text-xs`, { color: '#7cc0d8' }]}>
                View all {nonVisitedCustomers.length} pending customers...
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Detailed Customer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        {selectedPerson && (
          <DetailedCust
            person={selectedPerson}
            onClose={handleCloseModal}
            onResponseSaved={handleResponseSaved}
          />
        )}
      </Modal>
    </View>
  );
};

export default CusList;
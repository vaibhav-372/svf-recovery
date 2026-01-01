// screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuth } from '../context/AuthContext';
import tw from 'tailwind-react-native-classnames';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = async () => {
    setError('');
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);    
    try {
      const result = await login(username, password);
      console.log(`user name is ${username} and password is ${password}`)
      
      if (result.success) {
        console.log('Login successful, navigating to main app...');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError('');
  };

  return (
    <KeyboardAwareScrollView
      style={tw`flex-1 bg-gray-100`}
      contentContainerStyle={tw`flex-grow justify-center`}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}
      extraScrollHeight={20}
      enableAutomaticScroll={true}
    >
      <View style={tw`px-6 py-8`}>
        <View style={tw`bg-white rounded-2xl p-8 shadow-lg`}>
          <Text style={[tw`text-3xl font-bold text-center mb-2`, { color: '#7cc0d8' }]}>
            Agent Login
          </Text>
          <Text style={tw`text-gray-600 text-center mb-8`}>
            Login to your agent account
          </Text>

          {error ? (
            <View style={tw`mb-6 border border-red-300 rounded-xl p-4 bg-red-50`}>
              <Text style={tw`text-red-500 text-center`}>{error}</Text>
            </View>
          ) : null}

          <View style={tw`mb-6`}>
            <Text style={tw`text-gray-700 mb-2 font-medium`}>Username</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-xl px-4 py-4 bg-gray-50`}
              placeholder="Enter your username"
              placeholderTextColor="#9ca3af"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                clearError();
              }}
              autoCapitalize="none"
              editable={!isLoading}
              returnKeyType="next"
            />
          </View>

          <View style={tw`mb-8`}>
            <Text style={tw`text-gray-700 mb-2 font-medium`}>Password</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-xl px-4 py-4 bg-gray-50`}
              placeholder="Enter your password"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearError();
              }}
              secureTextEntry
              editable={!isLoading}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />
          </View>

          <TouchableOpacity
            style={[
              tw`rounded-xl py-4 mb-6 shadow-lg`,
              { backgroundColor: isLoading ? '#9ca3af' : '#7cc0d8' }
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tw`text-white text-center font-bold text-lg`}>
                Login
              </Text>
            )}
          </TouchableOpacity>

          <Text style={tw`text-gray-600 text-center text-sm`}>
            Only authorized agents can access this system
          </Text>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
};

export default LoginScreen;
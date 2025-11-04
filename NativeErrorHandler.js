// NativeErrorHandler.js
import { Platform } from 'react-native';

const NativeErrorHandler = {
  init: () => {
    console.log('NativeErrorHandler initialized');
    
    // Set up global error handler for uncaught promises (React Native way)
    if (!global.__hasSetPromiseRejectionHandler) {
      global.__hasSetPromiseRejectionHandler = true;
      
      // React Native uses different error handling
      const originalConsoleError = console.error;
      console.error = (...args) => {
        originalConsoleError.apply(console, args);
        // You can add error reporting service here
      };

      // Handle promise rejections (React Native approach)
      if (PromiseRejectionTracker) {
        // React Native internally handles promise rejections
      }
    }

    // Platform-specific initialization
    if (Platform.OS === 'android') {
      // Android-specific error handling
      console.log('Android error handler setup');
    } else if (Platform.OS === 'ios') {
      // iOS-specific error handling  
      console.log('iOS error handler setup');
    }
  },

  // Method to log errors safely
  logError: (error, context = '') => {
    try {
      const errorInfo = {
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        context,
        error: error?.toString?.(),
        stack: error?.stack,
        message: error?.message
      };
      console.log('ERROR_LOGGED:', JSON.stringify(errorInfo));
    } catch (e) {
      console.log('Failed to log error:', e);
    }
  }
};

export default NativeErrorHandler;
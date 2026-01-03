// NativeErrorHandler.js
import { Platform, NativeModules, BackHandler, ToastAndroid, LogBox } from 'react-native';

const NativeErrorHandler = {
  init: () => {
    console.log('NativeErrorHandler initialized for Android');
    
    // Ignore specific warnings if needed
    LogBox.ignoreLogs([
      'Setting a timer',
      'VirtualizedLists should never be nested',
      'Require cycles',
      'Deprecation warning'
    ]);
    
    // Set up global error handler
    if (!global.__hasSetErrorHandler) {
      global.__hasSetErrorHandler = true;
      
      // Override console.error to capture all errors
      const originalConsoleError = console.error;
      console.error = (...args) => {
        originalConsoleError.apply(console, args);
        NativeErrorHandler.logError(new Error(args.join(' ')), 'console.error');
      };

      // Handle unhandled promise rejections - React Native way
      if (global.Promise) {
        const originalPromise = global.Promise;
        
        // Wrap Promise to catch unhandled rejections
        global.Promise = function(executor) {
          return new originalPromise((resolve, reject) => {
            try {
              executor(
                (value) => {
                  resolve(value);
                },
                (reason) => {
                  NativeErrorHandler.logError(
                    reason instanceof Error ? reason : new Error(String(reason)),
                    'PromiseRejection'
                  );
                  reject(reason);
                }
              );
            } catch (error) {
              NativeErrorHandler.logError(error, 'PromiseConstructor');
              reject(error);
            }
          });
        };
        
        // Copy static methods
        Object.setPrototypeOf(global.Promise, originalPromise);
        global.Promise.resolve = originalPromise.resolve;
        global.Promise.reject = originalPromise.reject;
        global.Promise.all = originalPromise.all;
        global.Promise.race = originalPromise.race;
        global.Promise.allSettled = originalPromise.allSettled;
      }

      // Set up global error handler using ErrorUtils (available in React Native)
      if (global.ErrorUtils) {
        const originalErrorHandler = global.ErrorUtils.getGlobalHandler();
        global.ErrorUtils.setGlobalHandler((error, isFatal) => {
          NativeErrorHandler.logError(error, `GlobalError: ${isFatal ? 'FATAL' : 'NON-FATAL'}`);
          
          // For non-fatal errors, show toast and continue
          if (!isFatal && Platform.OS === 'android') {
            NativeErrorHandler.showToast('An error occurred. Please try again.');
          }
          
          // Call original handler
          if (originalErrorHandler) {
            originalErrorHandler(error, isFatal);
          }
        });
        console.log('Global error handler set up via ErrorUtils');
      } else {
        console.log('ErrorUtils not available, using fallback error handling');
        
        // Fallback: catch uncaught errors
        const originalOnError = global.onerror;
        global.onerror = (message, source, lineno, colno, error) => {
          NativeErrorHandler.logError(error || new Error(message), 'window.onerror');
          
          if (Platform.OS === 'android') {
            NativeErrorHandler.showToast('Application error');
          }
          
          if (originalOnError) {
            return originalOnError(message, source, lineno, colno, error);
          }
          return false;
        };
      }
    }

    // Android-specific initialization
    if (Platform.OS === 'android') {
      // Set up BackHandler error boundary
      try {
        // Monitor back button presses
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
          NativeErrorHandler.logError(new Error('Back button pressed'), 'BackHandler');
          // Return false to allow default back behavior
          return false;
        });
        
        // Store for cleanup
        NativeErrorHandler._backHandler = backHandler;
        console.log('BackHandler listener added');
      } catch (e) {
        console.log('Could not set up BackHandler:', e);
      }

      // Start memory monitoring
      NativeErrorHandler.setupMemoryMonitoring();
      
      // Check for Android issues
      setTimeout(() => {
        const issues = NativeErrorHandler.checkAndroidIssues();
        if (issues.length > 0) {
          console.log('Android startup issues:', issues);
          if (issues.includes('React Native bridge not initialized')) {
            NativeErrorHandler.showToast('App initialization issue detected');
          }
        }
      }, 3000);
    }
  },

  // Method to log errors safely
  logError: (error, context = '') => {
    try {
      // Create a safe error object
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      const errorInfo = {
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        context,
        error: errorObj.toString(),
        stack: errorObj.stack,
        message: errorObj.message,
        name: errorObj.name,
      };
      
      // Add Android-specific info if available
      if (Platform.OS === 'android') {
        try {
          errorInfo.androidVersion = Platform.Version;
          if (Platform.constants) {
            errorInfo.manufacturer = Platform.constants.Manufacturer || 'Unknown';
            errorInfo.model = Platform.constants.Model || 'Unknown';
            errorInfo.release = Platform.constants.Release || 'Unknown';
          }
        } catch (e) {
          // Ignore if we can't get platform constants
        }
      }
      
      console.log('ERROR_LOG:', JSON.stringify(errorInfo));
      
      // Save to async storage or send to server
      NativeErrorHandler.saveErrorToStorage(errorInfo);
      
      return errorInfo;
    } catch (e) {
      console.log('Failed to log error in logError:', e);
      return null;
    }
  },

  // Save error to AsyncStorage for later retrieval
  saveErrorToStorage: async (errorInfo) => {
    try {
      // You need to import AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      // Get existing errors
      const existingErrorsJson = await AsyncStorage.getItem('@app_error_logs');
      const existingErrors = existingErrorsJson ? JSON.parse(existingErrorsJson) : [];
      
      // Add new error (limit to last 100 errors)
      const updatedErrors = [errorInfo, ...existingErrors].slice(0, 100);
      
      // Save back
      await AsyncStorage.setItem('@app_error_logs', JSON.stringify(updatedErrors));
      
      console.log('Error saved to storage');
    } catch (storageError) {
      console.log('Failed to save error to storage:', storageError);
    }
  },

  // Show Android Toast safely
  showToast: (message, duration = ToastAndroid.SHORT) => {
    if (Platform.OS === 'android' && ToastAndroid && typeof ToastAndroid.show === 'function') {
      try {
        ToastAndroid.show(message, duration);
        return true;
      } catch (e) {
        console.log('Failed to show toast:', e);
        return false;
      }
    }
    return false;
  },

  // Android memory monitoring
  setupMemoryMonitoring: () => {
    if (Platform.OS !== 'android') return;
    
    let lastWarningTime = 0;
    const MEMORY_WARNING_INTERVAL = 30000; // 30 seconds
    
    // Check if memory API is available
    if (global.performance && global.performance.memory) {
      NativeErrorHandler._memoryMonitor = setInterval(() => {
        try {
          const memory = global.performance.memory;
          const usedMB = memory.usedJSHeapSize / (1024 * 1024);
          const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
          
          // Warn if memory usage is high
          if (usedMB > limitMB * 0.8) {
            const now = Date.now();
            if (now - lastWarningTime > MEMORY_WARNING_INTERVAL) {
              lastWarningTime = now;
              console.warn(`High memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`);
              NativeErrorHandler.showToast('High memory usage detected');
            }
          }
        } catch (e) {
          console.log('Memory monitoring error:', e);
        }
      }, 15000); // Check every 15 seconds
      
      console.log('Memory monitoring started');
    } else {
      console.log('Memory API not available on this device');
    }
  },

  // Check for Android specific issues
  checkAndroidIssues: () => {
    if (Platform.OS !== 'android') return [];
    
    const issues = [];
    
    // Check React Native bridge (common source of Android crashes)
    if (typeof global.__fbBatchedBridge === 'undefined') {
      issues.push('React Native bridge not initialized');
    }
    
    // Check for Hermes engine
    try {
      if (typeof HermesInternal === 'undefined') {
        console.log('Running on JavaScriptCore (JSC) engine');
      } else {
        console.log('Running on Hermes engine');
      }
    } catch (e) {
      console.log('Cannot detect JavaScript engine');
    }
    
    return issues;
  },

  // Safe function execution with error boundary
  safeExecute: (fn, context = '') => {
    try {
      return fn();
    } catch (error) {
      NativeErrorHandler.logError(error, `safeExecute: ${context}`);
      if (Platform.OS === 'android') {
        NativeErrorHandler.showToast('Operation failed. Please try again.');
      }
      return null;
    }
  },

  // Get stored errors (for debugging)
  getStoredErrors: async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const errorsJson = await AsyncStorage.getItem('@app_error_logs');
      return errorsJson ? JSON.parse(errorsJson) : [];
    } catch (e) {
      console.log('Failed to get stored errors:', e);
      return [];
    }
  },

  // Clear stored errors
  clearStoredErrors: async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('@app_error_logs');
      console.log('Stored errors cleared');
      return true;
    } catch (e) {
      console.log('Failed to clear stored errors:', e);
      return false;
    }
  },

  // Cleanup resources
  cleanup: () => {
    // Clear memory monitoring
    if (NativeErrorHandler._memoryMonitor) {
      clearInterval(NativeErrorHandler._memoryMonitor);
      console.log('Memory monitoring stopped');
    }
    
    // Remove back handler
    if (NativeErrorHandler._backHandler && NativeErrorHandler._backHandler.remove) {
      NativeErrorHandler._backHandler.remove();
      console.log('BackHandler listener removed');
    }
  }
};

// Auto-initialize when imported (optional)
// setTimeout(() => {
//   if (Platform.OS === 'android') {
//     NativeErrorHandler.init();
//   }
// }, 1000);

export default NativeErrorHandler;
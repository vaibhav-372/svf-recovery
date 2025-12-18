export const setupPromiseRejectionHandler = () => {
  if (!global.PromiseRejectionHandlerSet) {
    global.PromiseRejectionHandlerSet = true;
    
    // Handle unhandled promise rejections
    Promise.prototype.catch(() => {}); // This helps prevent unhandled promise warnings
    
    // For development, you can log promise rejections
    if (__DEV__) {
      const originalPromise = Promise;
      global.Promise = function Promise(executor) {
        return new originalPromise(executor).catch(error => {
          console.log('Unhandled Promise Rejection:', error);
          throw error;
        });
      };
      Object.setPrototypeOf(global.Promise, originalPromise);
      global.Promise.all = originalPromise.all;
      global.Promise.race = originalPromise.race;
      global.Promise.resolve = originalPromise.resolve;
      global.Promise.reject = originalPromise.reject;
    }
  }
};
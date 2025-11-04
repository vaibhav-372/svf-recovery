// Store the original console.log for special use
const originalLog = console.log;

// Disable regular console.log in all environments
console.log = () => {};

// Create a global function for important logs
export function logImportant(...args) {
  originalLog('[IMPORTANT]', ...args);
}

id="logger-basic"
const isDev = (process.env.NODE_ENV || '').toLowerCase() === 'development';

module.exports = {
  info: (...args) => {
    console.log('ℹ️', ...args);
  },

  error: (...args) => {
    console.error('❌', ...args);
  },

  debug: (...args) => {
    if (isDev) {
      console.log('🐞', ...args);
    }
  },
};
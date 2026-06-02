const fs = require('fs');
const path = require('path');

const baseConfig = require('./app.json');

const appConfig = baseConfig.expo ?? baseConfig;

const androidGoogleServicesFile = './google-services.json';
const iosGoogleServicesFile = './GoogleService-Info.plist';

const androidGoogleServicesPath = path.join(__dirname, 'google-services.json');
const iosGoogleServicesPath = path.join(__dirname, 'GoogleService-Info.plist');

if (fs.existsSync(androidGoogleServicesPath)) {
  appConfig.android = {
    ...appConfig.android,
    googleServicesFile: androidGoogleServicesFile,
  };
}

if (fs.existsSync(iosGoogleServicesPath)) {
  appConfig.ios = {
    ...appConfig.ios,
    googleServicesFile: iosGoogleServicesFile,
  };
}

module.exports = {
  expo: appConfig,
};
/* eslint-env node */
const appJson = require("./app.json");

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!apiUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is not set. Copy BookMyBarber-App/.env.example to .env and set your backend URL (e.g. http://192.168.x.x:5000/v1 or https://your-subdomain.ngrok-free.app/v1)."
  );
}

if (!/^https?:\/\//.test(apiUrl)) {
  throw new Error(
    `EXPO_PUBLIC_API_URL must start with http:// or https:// (got: ${apiUrl})`
  );
}

if (!apiUrl.endsWith("/v1")) {
  throw new Error(`EXPO_PUBLIC_API_URL must end with /v1 (got: ${apiUrl})`);
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins ?? []),
      "@react-native-community/datetimepicker",
    ],
    extra: {
      ...appJson.expo.extra,
      apiUrl,
    },
  },
};

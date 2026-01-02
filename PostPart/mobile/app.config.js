module.exports = {
  expo: {
    name: "PostPart",
    slug: "postpart-mobile",
    version: "1.0.0",
    orientation: "portrait",
    // icon: "./assets/icon.png", // TODO: Add icon image
    userInterfaceStyle: "light",
    scheme: "postpart",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#FFFFFF" // White background matching PostPart branding
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.postpart.mobile",
      infoPlist: {
        NSCameraUsageDescription: "PostPart needs camera access to scan QR codes and take profile photos.",
        NSPhotoLibraryUsageDescription: "PostPart needs access to your photo library to select profile photos.",
        NSMicrophoneUsageDescription: "PostPart does not use the microphone."
      }
    },
    android: {
      package: "com.postpart.mobile",
      permissions: ["CAMERA", "READ_MEDIA_IMAGES", "WRITE_EXTERNAL_STORAGE"]
    },
    web: {
      // favicon: "./assets/favicon.png" // TODO: Add favicon
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Allow PostPart to access your camera to scan QR codes and take profile photos."
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow PostPart to access your photos to set profile pictures.",
          cameraPermission: "Allow PostPart to access your camera to take profile photos."
        }
      ],
      "expo-router"
    ],
    experiments: {
      typedRoutes: true
    }
  }
};


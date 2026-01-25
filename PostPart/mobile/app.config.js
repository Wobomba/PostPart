module.exports = {
  expo: {
    name: "PostPart",
    slug: "postpart-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/postpart-logo.png",
    userInterfaceStyle: "light",
    scheme: "postpart",
    splash: {
      image: "./assets/splash-icon.png",
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
      adaptiveIcon: {
        foregroundImage: "./assets/postpart-logo.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.postpart.mobile",
      permissions: ["CAMERA", "READ_MEDIA_IMAGES", "WRITE_EXTERNAL_STORAGE"]
    },
    web: {
      favicon: "./assets/favicon.png"
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
      [
        "expo-notifications",
        {
          icon: "./assets/postpart-logo.png",
          color: "#E91E63"
        }
      ],
      "expo-router"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: "45fe80ea-facd-47ef-b4a7-3e43514a71e8"
      }
    }
  }
};


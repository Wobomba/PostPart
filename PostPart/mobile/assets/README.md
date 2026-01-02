# Assets Directory

This directory should contain the following image assets for the mobile app:

## Required Assets (for production)

1. **icon.png** - App icon (1024x1024 px)
2. **adaptive-icon.png** - Android adaptive icon (1024x1024 px)
3. **splash.png** - Splash screen image (1284x2778 px for iPhone 14 Pro Max)
4. **favicon.png** - Web favicon (48x48 px)

## Temporary Solution

For development, these assets are commented out in `app.config.js`. The app will run without them, but you'll see warnings.

## How to Add Assets

1. Create or download the required images
2. Place them in this `assets/` directory
3. Uncomment the asset references in `app.config.js`
4. Restart the Expo development server

## Design Guidelines

- **Icon**: Use PostPart logo with teal (#3EACA8) background
- **Splash**: Off-white background (#F8F7F5) with centered logo
- **Style**: Match the calm, child-focused theme of the app


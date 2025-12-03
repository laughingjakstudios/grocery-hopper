# PWA Icons TODO

The PWA manifest is configured but needs icon files. You'll need to create:

## Required Icons

1. **icon-192.png** (192x192px)
2. **icon-512.png** (512x512px)

## Quick Generation Options

### Option 1: Use an Icon Generator
- [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
- Upload a logo, download all sizes

### Option 2: Create Simple Placeholder Icons
Use any tool (Figma, Canva, Photoshop) to create:
- Square canvas (192x192 and 512x512)
- Blue background (#2563eb - matches theme color)
- White "GH" text or shopping cart icon
- Save as PNG

### Option 3: Use Favicon Generator
- Create a simple icon
- Use [RealFaviconGenerator](https://realfavicongenerator.net/)
- Download PWA icons

## Current Status
- Manifest points to `/icon-192.png` and `/icon-512.png`
- These files don't exist yet, so install prompt won't show
- App still works fine, just won't be installable until icons are added

## Testing Without Icons
The app will work perfectly in the browser. To test PWA features:
1. Add icons later
2. Use Chrome DevTools > Application > Manifest to verify
3. Look for "Add to Home Screen" prompt on mobile

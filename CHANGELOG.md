# Changelog

All notable changes to this project will be documented in this file.

## [0.3.1] - 2025-10-24

### 🎉 Major Release - Complete Feature Set!

This is a complete rewrite with all features working correctly, discovered through comprehensive mitmproxy analysis of the MyKobold iOS app.

#### ✨ What Works - EVERYTHING!

**Core Functions:**
- ✅ **START Cleaning** - Full house or specific room
- ✅ **PAUSE Cleaning** - Pause active session
- ✅ **RESUME Cleaning** - Resume paused session
- ✅ **RETURN TO BASE** - Send to charging station
- ✅ **Eco Mode** - Energy-saving cleaning
- ✅ **NoGo Lines** - Respect virtual boundaries
- ✅ **Spot Cleaning** - Clean specific areas

**New Features (v0.3.1):**
- 🆕 **Find Me** - Robot beeps and flashes LED
- 🆕 **Empty Dustbin** - Trigger auto-extraction at dock
- 🆕 **Zone Cleaning** - Clean specific rooms
- 🆕 **Native Vacuum Service** - Proper HomeKit vacuum icon (iOS 18.4+)

#### 🔧 Technical Implementation

**API Endpoints Discovered:**

```javascript
// Get Robots
GET https://orbital.ksecosys.com/users/me/robots

// Get Zones/Rooms
GET https://orbital.ksecosys.com/maps/floorplans/{floorplan_uuid}/tracks

// Start Cleaning (uses UUID)
POST https://orbital.ksecosys.com/robots/{robot_uuid}/cleaning/v2
Body: {
  "runs": [{
    "map": {
      "floorplan_uuid": "...",
      "zone_uuid": null,  // or specific zone UUID
      "nogo_enabled": true
    },
    "settings": {
      "mode": "eco",  // or "auto"
      "navigation_mode": "normal"
    }
  }]
}

// Control Commands (uses Serial Number)
POST https://orbital.ksecosys.com/vendors/3/robots/{serial}/messages

// Pause
{"ability": "cleaning.pause"}

// Resume
{"ability": "cleaning.resume"}

// Return to Base
{"ability": "navigation.return_to_base"}

// Find Me
{"ability": "utilities.find_me"}

// Empty Dustbin
{"ability": "extraction.start"}

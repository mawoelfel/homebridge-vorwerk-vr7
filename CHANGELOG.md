# Changelog

All notable changes to this project will be documented in this file.

## [3.0.0] - 2024-10-24

### 🎉 MAJOR RELEASE - ALL FUNCTIONS WORKING!

This is the **first fully working version** with all control functions operational!

#### ✅ What's Fixed - EVERYTHING!

**All control functions now work correctly** by using the proper API endpoints discovered through comprehensive mitmproxy capture:

- ✅ **START Cleaning** - Works perfectly
- ✅ **PAUSE Cleaning** - NOW WORKS! 🎉
- ✅ **RESUME Cleaning** - NOW WORKS! 🎉
- ✅ **RETURN TO BASE** - NOW WORKS! 🎉
- ✅ **Eco Mode** - Applied correctly
- ✅ **NoGo Lines** - Applied correctly
- ✅ **Spot Cleaning** - Works

#### 🔧 Technical Breakthrough

The plugin now uses **TWO different API patterns** discovered through actual app traffic capture:

**Pattern 1: Start Cleaning (uses robot UUID)**
```http
POST https://orbital.ksecosys.com/robots/{robot_uuid}/cleaning/v2
Content-Type: application/json

{
  "runs": [{
    "map": {
      "nogo_enabled": true,
      "zone_uuid": null,
      "floorplan_uuid": "uuid"
    },
    "settings": {
      "mode": "eco",
      "navigation_mode": "normal"
    }
  }]
}

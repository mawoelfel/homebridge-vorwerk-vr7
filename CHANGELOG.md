# Changelog

All notable changes to this project will be documented in this file.

## [3.1.0] - 2024-10-24

### 🎉 MAJOR UPDATE - New Features!

This release adds three major new features discovered through mitmproxy capture:

#### ✨ New Features

**1. 🔊 Find Me Function**
- Robot beeps and flashes LED to help locate it
- Perfect when robot is stuck under furniture
- Endpoint: `POST /vendors/3/robots/{serial}/messages` with `{"ability":"utilities.find_me"}`
- HomeKit: Switch "VR7 Find Me"

**2. 🗑️ Empty Dustbin (Auto-Extraction)**
- Triggers automatic dustbin emptying at the dock
- Only works with compatible charging stations
- Endpoint: `POST /vendors/3/robots/{serial}/messages` with `{"ability":"extraction.start"}`
- HomeKit: Switch "VR7 Empty Dustbin"

**3. 🗺️ Zone/Room Cleaning**
- Clean specific rooms instead of entire house
- Loads available zones from robot's map
- Endpoint: `GET /maps/floorplans/{uuid}/tracks`
- Uses same cleaning API with `zone_uuid` parameter
- HomeKit: One switch per room (e.g., "VR7 Kitchen", "VR7 Living Room")

**4. 🤖 Native HomeKit Vacuum Service**
- Robot appears as native Vacuum Cleaner in HomeKit (iOS 18.4+)
- Proper vacuum icon and controls
- States: Idle, Cleaning, Returning to Dock
- Intelligent feature detection:
  - If `Characteristic.TargetCleaningMode` available → Native eco/auto selection
  - If not available → Falls back to "Eco Mode" switch
  - If `Characteristic.RoomSelector` available → Native room selection
  - If not available → Individual room switches

#### 🔧 Technical Improvements

**API Library (lib/vorwerk-orbital-api.js):**
- Added `findMe()` function
- Added `emptyDustbin()` function
- Added `getZones()` function to load room list
- Added `startZoneCleaning(zoneUuid, eco, noGoLines, callback)` function
- Better error logging

**HomeKit Integration (index.js):**
- Now uses `Service.VacuumCleaner` (native vacuum service)
- `Characteristic.Active` - On/Off control
- `Characteristic.CurrentVacuumState` - Status display
- `Characteristic.TargetVacuumState` - Manual/Auto/Stop
- Optional `Characteristic.TargetCleaningMode` - Eco/Auto (if supported by Homebridge)
- Intelligent characteristic detection
- Dynamic room switches based on loaded zones
- Auto-off for momentary switches (Find Me, Empty Dustbin)

#### 📋 Complete API Endpoints

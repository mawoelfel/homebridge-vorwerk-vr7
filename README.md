# homebridge-vorwerk-vr7

This is a plugin for [homebridge](https://github.com/nfarina/homebridge) to control your [Vorwerk Kobold VR7](https://kobold.vorwerk.de/saugroboter/) vacuum robot. You can download it via [npm](https://www.npmjs.com/package/homebridge-vorwerk-vr7).

Based on nicoh88's [homebridge-vorwerk](https://github.com/nicoh88/homebridge-vorwerk) for VR200/VR300.

Feel free to leave any feedback [here](https://github.com/mawoelfel/homebridge-vorwerk-vr7/issues).

## Features

- Start and pause cleaning
- Start and pause spot cleaning
- Return to dock
- Toggle schedule
- Toggle eco mode
- Toggle nogo lines
- Toggle 4x4 mode (spot)
- Toggle repeat mode (spot)
- Get battery info
- Get dock info
- Periodic refresh of robot state
- Support for multiple robots

## Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-vorwerk-vr7`
3. Update your configuration file. See the sample below.

## Configuration

Add the following information to your config file. Change the values for email and password.

### Simple (Using OAuth2 Token - Recommended)

```json
"platforms": [
	{
		"platform": "VorwerkVR7VacuumRobot",
		"token": "YourToken"
	}
]
```

You can get a token using the following two curl commands:

```bash
# This will trigger the email sending
curl -X "POST" "https://mykobold.eu.auth0.com/passwordless/start" \
     -H 'Content-Type: application/json' \
     -d $'{
  "send": "code",
  "email": "ENTER_YOUR_EMAIL_HERE",
  "client_id": "KY4YbVAvtgB7lp8vIbWQ7zLk3hssZlhR",
  "connection": "email"
}'
```
==== wait for the email to be received ====

```bash
# this will generate a token using the numbers you received via email
# replace the value of otp 123456 with the value you received from the email
curl -X "POST" "https://mykobold.eu.auth0.com/oauth/token" \
     -H 'Content-Type: application/json' \
     -d $'{
  "prompt": "login",
  "grant_type": "http://auth0.com/oauth/grant-type/passwordless/otp",
  "scope": "openid email profile read:current_user",
  "locale": "en",
  "otp": "123456",
  "source": "vorwerk_auth0",
  "platform": "ios",
  "audience": "https://mykobold.eu.auth0.com/userinfo",
  "username": "ENTER_YOUR_EMAIL_HERE",
  "client_id": "KY4YbVAvtgB7lp8vIbWQ7zLk3hssZlhR",
  "realm": "email",
  "country_code": "DE"
}'
```

From the output, you want to copy the `id_token` value.

### Advanced

The following config contains advanced optional settings.

The parameter **refresh** sets an interval in seconds that is used to update the robot state in the background. This is only required for automations based on the robot state. The default value is `auto` which means that the update is automatically enabled while cleaning and disabled while not cleaning. You can set a value in seconds e.g. `120` to enable background updates even when the robot is not cleaning. You can also set `0` to disable background updates completely.

The parameter **disabled** accepts a list of switches/sensors that can be disabled in the plugin (e.g. dock, dockstate, eco, schedule, spot, nogolines).

```json
"platforms": [
	{
		"platform": "VorwerkVR7VacuumRobot",
		"token": "YourToken",
		"refresh": "120",
		"disabled": ["dock", "dockstate", "eco", "nogolines", "schedule", "spot"]
	}
]
```

### Legacy (Username/Password - May not work with newer MyKobold apps)

```json
"platforms": [
	{
		"platform": "VorwerkVR7VacuumRobot",
		"email": "YourEmail",
		"password": "YourPassword"
	}
]
```

## Tested robots

- Vorwerk Kobold VR7

If you have another connected vorwerk robot, please [tell me](https://github.com/mawoelfel/homebridge-vorwerk-vr7/issues) about your experience with this plugin.

## HomeKit Integration

The plugin creates the following HomeKit accessories:

- **Clean Switch**: Start/pause house cleaning
- **Spot Clean Switch**: Start/pause spot cleaning
- **Spot Clean 4x4 Switch**: Toggle 4x4 mode for spot cleaning (400x400cm instead of 200x200cm)
- **Spot Clean Extra Care Switch**: Toggle repeat mode for spot cleaning (2x)
- **Go to Dock Switch**: Send robot back to charging dock
- **Dock Sensor**: Shows if robot is docked
- **Eco Mode Switch**: Toggle eco cleaning mode
- **NoGo Lines Switch**: Enable/disable NoGo lines
- **Schedule Switch**: Enable/disable cleaning schedule
- **Battery Service**: Shows battery level and charging state

## Troubleshooting

### Can't log in to Vorwerk Cloud

- Make sure you're using the correct email and token/password
- Try generating a new token using the curl commands above
- Check if you can log in to the MyKobold app

### Robot not responding

- Check if the robot is online in the MyKobold app
- Make sure your homebridge server can reach the internet
- Try restarting homebridge

### Background updates not working

- Check the `refresh` parameter in your config
- Set it to `auto` for automatic updates while cleaning
- Set it to a number (e.g. `120`) for updates every X seconds

## Changelog

### 1.0.0
* Initial release for Vorwerk Kobold VR7
* Based on homebridge-vorwerk v0.4.0
* OAuth2 authentication support
* Full HomeKit integration

## Credits

- Based on [homebridge-vorwerk](https://github.com/nicoh88/homebridge-vorwerk) by nicoh88
- Uses [node-kobold](https://github.com/naofireblade/node-kobold) library

## License

MIT License

Copyright (c) 2025 mawoelfel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
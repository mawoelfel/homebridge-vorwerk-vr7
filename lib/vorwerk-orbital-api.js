'use strict';

const https = require('https');

const ORBITAL_HOST = 'orbital.ksecosys.com';
const BEEHIVE_HOST = 'beehive.ksecosys.com';

class VorwerkOrbitalClient {
    constructor() {
        this.token = null;
    }

    setToken(token) {
        this.token = token;
    }

    _request(hostname, method, path, data, callback) {
        const options = {
            hostname: hostname,
            path: path,
            method: method,
            headers: {
                'Authorization': 'Auth0Bearer ' + this.token,
                'Accept': 'application/vnd.neato.orbital-http.v1+json',
                'Content-Type': 'application/json',
                'User-Agent': 'MyKobold/3.12.0'
            }
        };

        if (data) {
            const body = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = https.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = body ? JSON.parse(body) : null;
                    
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        callback(null, json);
                    } else {
                        callback(new Error(`API Error: ${res.statusCode}`), json);
                    }
                } catch (e) {
                    callback(e, body);
                }
            });
        });

        req.on('error', (e) => {
            callback(e);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    }

    getRobots(callback) {
        // Zuerst Beehive API versuchen
        this._request(BEEHIVE_HOST, 'GET', '/users/me/robots', null, (error, beehiveData) => {
            if (error) {
                // Fallback zu Orbital
                this._request(ORBITAL_HOST, 'GET', '/users/me/robots', null, (err, orbitalData) => {
                    if (err) {
                        return callback(err);
                    }
                    this._processRobots(orbitalData, callback);
                });
            } else {
                this._processRobots(beehiveData, callback);
            }
        });
    }

    _processRobots(data, callback) {
        if (!data || !Array.isArray(data)) {
            return callback(null, []);
        }

        const robots = data
            .filter(r => r.model === 'VR7' || r.productId === 'VR7')
            .map(robotData => new VorwerkVR7Robot(robotData, this));
        
        callback(null, robots);
    }
}

class VorwerkVR7Robot {
    constructor(data, client) {
        this._data = data;
        this._client = client;
        
        this.name = data.name || data.nickname || 'VR7';
        this._serial = data.serial || data.serialNo;
        this._robotId = data.id || data.robotId;
        this._model = 'VR7';
        
        // Status
        this.state = data.state || 1;
        this.charge = data.details?.charge || 100;
        this.isDocked = data.details?.isDocked !== false;
        this.isCharging = data.details?.isCharging || false;
        this.eco = false;
        this.noGoLines = true;
        this.isScheduleEnabled = data.availableSchedules?.length > 0;
        
        // Floorplan für Cleaning
        this._floorplanUuid = null;
        
        // Capabilities
        this.canStart = true;
        this.canResume = false;
        this.canPause = false;
        this.canGoToBase = true;
        this.dockHasBeenSeen = true;
    }

    getState(callback) {
        // Hole aktuellen Status
        this._client._request(ORBITAL_HOST, 'GET', `/robots/${this._robotId}/features`, null, (error, data) => {
            if (error) {
                return callback(error);
            }

            if (data) {
                this._updateFromFeatures(data);
            }

            callback(null, data);
        });
    }

    _updateFromFeatures(features) {
        // Parse Features/Status
        if (features.state) {
            const stateMap = {
                'idle': 1,
                'ready': 1,
                'cleaning': 2,
                'busy': 2,
                'paused': 3,
                'stopped': 3,
                'error': 4
            };
            this.state = stateMap[features.state] || 1;
        }

        if (features.battery !== undefined) {
            this.charge = features.battery;
        }

        if (features.isDocked !== undefined) {
            this.isDocked = features.isDocked;
        }

        if (features.isCharging !== undefined) {
            this.isCharging = features.isCharging;
        }

        // Update capabilities
        this.canStart = this.state === 1;
        this.canPause = this.state === 2;
        this.canResume = this.state === 3;
        this.canGoToBase = this.state !== 1;
    }

    _getFloorplan(callback) {
        // Hole Floorplan falls noch nicht vorhanden
        if (this._floorplanUuid) {
            return callback(null, this._floorplanUuid);
        }

        this._client._request(ORBITAL_HOST, 'GET', `/robots/${this._robotId}/floorplans`, null, (error, data) => {
            if (error || !data || !Array.isArray(data) || data.length === 0) {
                return callback(error || new Error('No floorplans'));
            }

            // Nimm den ersten Floorplan
            this._floorplanUuid = data[0].uuid || data[0].id;
            callback(null, this._floorplanUuid);
        });
    }

    startCleaning(eco, navigationMode, noGoLines, callback) {
        this._getFloorplan((err, floorplanUuid) => {
            if (err) {
                // Ohne Floorplan versuchen
                floorplanUuid = null;
            }

            const command = {
                runs: [
                    {
                        map: {
                            floorplan_uuid: floorplanUuid,
                            zone_uuid: null,
                            nogo_enabled: noGoLines
                        },
                        settings: {
                            mode: eco ? 'eco' : 'auto',
                            navigation_mode: navigationMode || 'normal'
                        }
                    }
                ]
            };

            this._client._request(ORBITAL_HOST, 'POST', `/robots/${this._robotId}/cleaning/v2`, command, callback);
        });
    }

    startSpotCleaning(eco, width, height, repeat, navigationMode, callback) {
        const command = {
            runs: [
                {
                    map: {
                        zone_uuid: null,
                        spot_cleaning: {
                            width: width || 200,
                            height: height || 200
                        }
                    },
                    settings: {
                        mode: eco ? 'eco' : 'auto',
                        navigation_mode: navigationMode || 'normal'
                    }
                }
            ]
        };

        this._client._request(ORBITAL_HOST, 'POST', `/robots/${this._robotId}/cleaning/v2`, command, callback);
    }

    pauseCleaning(callback) {
        const command = { action: 'pause' };
        this._client._request(ORBITAL_HOST, 'POST', `/robots/${this._robotId}/state`, command, callback);
    }

    resumeCleaning(callback) {
        const command = { action: 'resume' };
        this._client._request(ORBITAL_HOST, 'POST', `/robots/${this._robotId}/state`, command, callback);
    }

    sendToBase(callback) {
        const command = { action: 'return_to_base' };
        this._client._request(ORBITAL_HOST, 'POST', `/robots/${this._robotId}/state`, command, callback);
    }

    enableSchedule(callback) {
        callback(new Error('Schedule control not yet implemented'));
    }

    disableSchedule(callback) {
        callback(new Error('Schedule control not yet implemented'));
    }
}

module.exports = {
    Client: VorwerkOrbitalClient,
    Robot: VorwerkVR7Robot
};

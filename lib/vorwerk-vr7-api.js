'use strict';

const https = require('https');

const API_BASE = 'api-2-prod.companion.kobold.vorwerk.com';
const API_PATH = '/api/v1';

class VorwerkVR7Client {
    constructor() {
        this.token = null;
    }

    setToken(token) {
        this.token = token;
    }

    _request(method, path, data, callback) {
        const options = {
            hostname: API_BASE,
            path: API_PATH + path,
            method: method,
            headers: {
                'Authorization': 'Bearer ' + this.token,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'MyKobold/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 304) {
                    // Not Modified - kein neuer Content
                    return callback(null, null);
                }
                
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

    getProfile(callback) {
        this._request('GET', '/profile', null, callback);
    }

    getProducts(callback) {
        this._request('GET', '/profile/products', null, (error, data) => {
            if (error) {
                return callback(error);
            }

            if (!data || !Array.isArray(data)) {
                return callback(null, []);
            }

            // Filtere nur VR7 Roboter
            const vr7Products = data.filter(p => p.productType === 'VR7' || p.id?.includes('VR7'));
            const robots = vr7Products.map(productData => new VorwerkVR7Robot(productData, this));
            
            callback(null, robots);
        });
    }

    getRobots(callback) {
        // Alias für Kompatibilität
        this.getProducts(callback);
    }
}

class VorwerkVR7Robot {
    constructor(data, client) {
        this._data = data;
        this._client = client;
        
        this.name = data.name || data.nickname || 'VR7';
        this._serial = data.serialNumber || data.serial || data.id;
        this._productId = data.id;
        this._model = 'VR7';
        
        // Status Defaults
        this.state = 1; // 1=idle, 2=cleaning, 3=paused, 4=error
        this.charge = 100;
        this.isDocked = true;
        this.isCharging = false;
        this.eco = false;
        this.noGoLines = true;
        this.isScheduleEnabled = false;
        
        // Capabilities
        this.canStart = true;
        this.canResume = false;
        this.canPause = false;
        this.canGoToBase = true;
        this.dockHasBeenSeen = false;
    }

    getState(callback) {
        // Status vom Roboter holen
        this._client._request('GET', `/profile/products`, null, (error, data) => {
            if (error) {
                return callback(error);
            }

            // Finde diesen Roboter in der Liste
            const robotData = data.find(p => p.id === this._productId || p.serialNumber === this._serial);
            
            if (robotData && robotData.status) {
                this._updateFromStatus(robotData.status);
            }

            callback(null, robotData);
        });
    }

    _updateFromStatus(status) {
        // Parse Status-Informationen
        if (status.battery !== undefined) {
            this.charge = status.battery;
        }
        
        if (status.isDocked !== undefined) {
            this.isDocked = status.isDocked;
        }
        
        if (status.isCharging !== undefined) {
            this.isCharging = status.isCharging;
        }
        
        if (status.state !== undefined) {
            // Mappe Status
            switch(status.state) {
                case 'idle':
                case 'ready':
                    this.state = 1;
                    this.canStart = true;
                    this.canPause = false;
                    this.canResume = false;
                    break;
                case 'cleaning':
                case 'busy':
                    this.state = 2;
                    this.canStart = false;
                    this.canPause = true;
                    this.canResume = false;
                    break;
                case 'paused':
                    this.state = 3;
                    this.canStart = false;
                    this.canPause = false;
                    this.canResume = true;
                    break;
                case 'error':
                    this.state = 4;
                    this.canStart = false;
                    break;
            }
        }
    }

    startCleaning(eco, navigationMode, noGoLines, callback) {
        const command = {
            action: 'start',
            mode: eco ? 'eco' : 'turbo',
            useNoGoLines: noGoLines
        };

        this._sendCommand(command, callback);
    }

    startSpotCleaning(eco, width, height, repeat, navigationMode, callback) {
        const command = {
            action: 'spotClean',
            mode: eco ? 'eco' : 'turbo',
            spotSize: width >= 400 ? 'large' : 'small',
            repeat: repeat
        };

        this._sendCommand(command, callback);
    }

    pauseCleaning(callback) {
        this._sendCommand({ action: 'pause' }, callback);
    }

    resumeCleaning(callback) {
        this._sendCommand({ action: 'resume' }, callback);
    }

    sendToBase(callback) {
        this._sendCommand({ action: 'returnToDock' }, callback);
    }

    enableSchedule(callback) {
        this._sendCommand({ action: 'enableSchedule' }, callback);
    }

    disableSchedule(callback) {
        this._sendCommand({ action: 'disableSchedule' }, callback);
    }

    _sendCommand(command, callback) {
        // Sende Befehl an VR7
        this._client._request('POST', `/products/${this._productId}/commands`, command, callback);
    }
}

module.exports = {
    Client: VorwerkVR7Client,
    Robot: VorwerkVR7Robot
};

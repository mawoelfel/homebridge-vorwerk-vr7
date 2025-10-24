'use strict';

const vorwerk = require('./lib/vorwerk-orbital-api');

let Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    
    homebridge.registerPlatform("homebridge-vorwerk-vr7", "VorwerkVR7VacuumRobot", VorwerkVR7Platform);
};

function VorwerkVR7Platform(log, config) {
    this.log = log;
    this.token = config['token'];
    this.hiddenServices = ('disabled' in config ? config['disabled'] : '');
    
    this.log("Vorwerk VR7 Platform Plugin Loaded - v3.1.0");
}

VorwerkVR7Platform.prototype = {
    accessories: function(callback) {
        let accessories = [];
        
        let client = new vorwerk.Client();
        client.setToken(this.token);
        
        this.log("Fetching robots from Vorwerk API...");
        
        client.getRobots((error, robots) => {
            if (error) {
                this.log("ERROR: Could not fetch robots");
                this.log(error);
                callback([]);
            } else {
                this.log("Found " + robots.length + " robot(s)");
                
                for (let robot of robots) {
                    let accessory = new VorwerkVR7Accessory(this.log, robot, this.hiddenServices);
                    accessories.push(accessory);
                }
                
                callback(accessories);
            }
        });
    }
};

function VorwerkVR7Accessory(log, robot, hiddenServices) {
    this.log = log;
    this.robot = robot;
    this.hiddenServices = hiddenServices.split(',');
    
    this.name = this.robot.name;
    
    // State tracking
    this.currentState = Characteristic.CurrentVacuumState.IDLE;
    this.targetState = Characteristic.TargetVacuumState.STOP;
    this.isActive = false;
    
    // Cleaning intensity (eco mode)
    this.ecoMode = false;
    
    this.log("Initializing native vacuum accessory: " + this.name);
    
    // Check available characteristics
    this.checkAvailableCharacteristics();
    
    // Load zones
    this.zones = [];
    this.loadZones();
}

VorwerkVR7Accessory.prototype = {
    
    checkAvailableCharacteristics: function() {
        // Prüfe welche Characteristics verfügbar sind
        this.hasCleaningMode = false;
        this.hasRoomSelector = false;
        
        // Test ob TargetCleaningMode existiert
        try {
            if (Characteristic.TargetCleaningMode) {
                this.hasCleaningMode = true;
                this.log("✓ Native CleaningMode supported");
            }
        } catch(e) {
            this.log("✗ Native CleaningMode NOT supported (will use switch)");
        }
        
        // Test ob RoomSelector existiert  
        try {
            if (Characteristic.RoomSelector) {
                this.hasRoomSelector = true;
                this.log("✓ Native RoomSelector supported");
            }
        } catch(e) {
            this.log("✗ Native RoomSelector NOT supported (will use switches)");
        }
    },
    
    loadZones: function() {
        let that = this;
        this.robot.getZones((error, zones) => {
            if (!error && zones && zones.length > 0) {
                that.zones = zones;
                that.log("Loaded " + zones.length + " zones");
            } else {
                that.log("Could not load zones (full house cleaning only)");
            }
        });
    },
    
    identify: function(callback) {
        this.log("Identify requested - triggering Find Me");
        this.robot.findMe((error) => {
            if (error) {
                this.log("Find Me failed: " + error);
            }
            callback();
        });
    },
    
    getServices: function() {
        let services = [];
        
        // ============================================
        // Accessory Information
        // ============================================
        
        let informationService = new Service.AccessoryInformation();
        informationService
            .setCharacteristic(Characteristic.Manufacturer, "Vorwerk")
            .setCharacteristic(Characteristic.Model, this.robot._model || "VR7")
            .setCharacteristic(Characteristic.SerialNumber, this.robot._serial || "Unknown")
            .setCharacteristic(Characteristic.FirmwareRevision, "3.1.0");
        services.push(informationService);
        
        // ============================================
        // MAIN: Native Vacuum Cleaner Service
        // ============================================
        
        this.vacuumService = new Service.VacuumCleaner(this.name);
        
        // Active
        this.vacuumService
            .getCharacteristic(Characteristic.Active)
            .on('set', this.setActive.bind(this))
            .on('get', this.getActive.bind(this));
        
        // Current State
        this.vacuumService
            .getCharacteristic(Characteristic.CurrentVacuumState)
            .on('get', this.getCurrentState.bind(this));
        
        // Target State
        this.vacuumService
            .getCharacteristic(Characteristic.TargetVacuumState)
            .on('set', this.setTargetState.bind(this))
            .on('get', this.getTargetState.bind(this));
        
        // ============================================
        // CONDITIONAL: Native Cleaning Mode (ECO/AUTO)
        // ============================================
        
        if (this.hasCleaningMode) {
            this.log("Adding native CleaningMode characteristic");
            
            this.vacuumService
                .getCharacteristic(Characteristic.CurrentCleaningMode)
                .on('get', this.getCurrentCleaningMode.bind(this));
            
            this.vacuumService
                .getCharacteristic(Characteristic.TargetCleaningMode)
                .on('set', this.setTargetCleaningMode.bind(this))
                .on('get', this.getTargetCleaningMode.bind(this));
        } else {
            // Fallback: Eco Mode als Switch
            this.log("Adding Eco Mode as Switch (CleaningMode not available)");
            
            this.vacuumRobotEcoService = new Service.Switch(this.name + " Eco Mode", "eco");
            this.vacuumRobotEcoService
                .getCharacteristic(Characteristic.On)
                .on('set', this.setEco.bind(this))
                .on('get', this.getEco.bind(this));
            services.push(this.vacuumRobotEcoService);
        }
        
        services.push(this.vacuumService);
        
        // ============================================
        // ADDITIONAL: NoGo Lines
        // ============================================
        
        if (this.hiddenServices.indexOf('nogolines') === -1) {
            this.vacuumRobotNoGoLinesService = new Service.Switch(this.name + " NoGo Lines", "nogolines");
            this.vacuumRobotNoGoLinesService
                .getCharacteristic(Characteristic.On)
                .on('set', this.setNoGoLines.bind(this))
                .on('get', this.getNoGoLines.bind(this));
            services.push(this.vacuumRobotNoGoLinesService);
        }
        
        // ============================================
        // ADDITIONAL: Spot Clean
        // ============================================
        
        if (this.hiddenServices.indexOf('spot') === -1) {
            this.vacuumRobotSpotCleanService = new Service.Switch(this.name + " Spot Clean", "spotclean");
            this.vacuumRobotSpotCleanService
                .getCharacteristic(Characteristic.On)
                .on('set', this.setSpotClean.bind(this))
                .on('get', this.getSpotClean.bind(this));
            services.push(this.vacuumRobotSpotCleanService);
        }
        
        // ============================================
        // ADDITIONAL: Find Me
        // ============================================
        
        if (this.hiddenServices.indexOf('findme') === -1) {
            this.vacuumRobotFindMeService = new Service.Switch(this.name + " Find Me", "findme");
            this.vacuumRobotFindMeService
                .getCharacteristic(Characteristic.On)
                .on('set', this.setFindMe.bind(this))
                .on('get', this.getFindMe.bind(this));
            services.push(this.vacuumRobotFindMeService);
        }
        
        // ============================================
        // ADDITIONAL: Empty Dustbin
        // ============================================
        
        if (this.hiddenServices.indexOf('emptydustbin') === -1) {
            this.vacuumRobotEmptyDustbinService = new Service.Switch(this.name + " Empty Dustbin", "emptydustbin");
            this.vacuumRobotEmptyDustbinService
                .getCharacteristic(Characteristic.On)
                .on('set', this.setEmptyDustbin.bind(this))
                .on('get', this.getEmptyDustbin.bind(this));
            services.push(this.vacuumRobotEmptyDustbinService);
        }
        
        // ============================================
        // ADDITIONAL: Zone Cleaning (als Switches)
        // ============================================
        
        if (this.zones && this.zones.length > 0 && !this.hasRoomSelector) {
            this.log("Adding zone switches (RoomSelector not available)");
            
            for (let zone of this.zones) {
                if (zone.name && zone.uuid) {
                    let zoneService = new Service.Switch(this.name + " " + zone.name, "zone_" + zone.uuid);
                    zoneService
                        .getCharacteristic(Characteristic.On)
                        .on('set', this.setZoneCleaning.bind(this, zone.uuid, zone.name))
                        .on('get', this.getZoneCleaning.bind(this));
                    services.push(zoneService);
                    
                    this.log("  Added zone: " + zone.name);
                }
            }
        }
        
        return services;
    },
    
    // ============================================
    // Vacuum Service: Basic Control
    // ============================================
    
    setActive: function(on, callback) {
        this.log("setActive: " + on);
        this.isActive = on;
        
        if (on) {
            this.startCleaning(null, callback);
        } else {
            this.pauseCleaning(callback);
        }
    },
    
    getActive: function(callback) {
        callback(null, this.isActive);
    },
    
    getCurrentState: function(callback) {
        callback(null, this.currentState);
    },
    
    setTargetState: function(state, callback) {
        this.log("setTargetState: " + state);
        this.targetState = state;
        
        switch(state) {
            case Characteristic.TargetVacuumState.MANUAL:
            case Characteristic.TargetVacuumState.AUTO:
                this.startCleaning(null, callback);
                break;
                
            case Characteristic.TargetVacuumState.STOP:
                this.pauseCleaning(callback);
                break;
                
            default:
                callback();
        }
    },
    
    getTargetState: function(callback) {
        callback(null, this.targetState);
    },
    
    // ============================================
    // Vacuum Service: Cleaning Mode (wenn verfügbar)
    // ============================================
    
    setTargetCleaningMode: function(mode, callback) {
        this.log("setTargetCleaningMode: " + mode);
        
        // Map HomeKit CleaningMode to VR7 eco/auto
        // Annahme: 0=AUTO, 1=ECO (muss getestet werden!)
        if (mode === 0) {
            this.ecoMode = false;
            this.log("  → VR7 Mode: AUTO");
        } else if (mode === 1) {
            this.ecoMode = true;
            this.log("  → VR7 Mode: ECO");
        }
        
        this.vacuumService.getCharacteristic(Characteristic.CurrentCleaningMode).updateValue(mode);
        callback();
    },
    
    getTargetCleaningMode: function(callback) {
        callback(null, this.ecoMode ? 1 : 0);
    },
    
    getCurrentCleaningMode: function(callback) {
        callback(null, this.ecoMode ? 1 : 0);
    },
    
    // ============================================
    // Cleaning Operations
    // ============================================
    
    startCleaning: function(zoneUuid, callback) {
        let that = this;
        
        // Get settings
        let eco = this.ecoMode;
        let nogoLines = this.vacuumRobotNoGoLinesService ? 
            this.vacuumRobotNoGoLinesService.getCharacteristic(Characteristic.On).value : true;
        
        this.log("Starting cleaning:");
        this.log("  Mode: " + (eco ? "ECO" : "AUTO"));
        this.log("  NoGo: " + nogoLines);
        this.log("  Zone: " + (zoneUuid ? zoneUuid : "Full House"));
        
        if (this.robot.canStart) {
            let startFunc;
            
            if (zoneUuid) {
                startFunc = (cb) => that.robot.startZoneCleaning(zoneUuid, eco, nogoLines, cb);
            } else {
                startFunc = (cb) => that.robot.startCleaning(eco, 'normal', nogoLines, cb);
            }
            
            startFunc(function(error) {
                if (!error) {
                    that.isActive = true;
                    that.currentState = Characteristic.CurrentVacuumState.CLEANING;
                    that.vacuumService.getCharacteristic(Characteristic.Active).updateValue(true);
                    that.vacuumService.getCharacteristic(Characteristic.CurrentVacuumState).updateValue(that.currentState);
                    that.log("✓ Cleaning started");
                }
                callback(error);
            });
        } else if (this.robot.canResume) {
            this.robot.resumeCleaning(function(error) {
                if (!error) {
                    that.isActive = true;
                    that.currentState = Characteristic.CurrentVacuumState.CLEANING;
                    that.vacuumService.getCharacteristic(Characteristic.Active).updateValue(true);
                    that.vacuumService.getCharacteristic(Characteristic.CurrentVacuumState).updateValue(that.currentState);
                    that.log("✓ Resumed");
                }
                callback(error);
            });
        } else {
            this.log("Cannot start/resume");
            callback();
        }
    },
    
    pauseCleaning: function(callback) {
        let that = this;
        
        if (this.robot.canPause) {
            this.robot.pauseCleaning(function(error) {
                if (!error) {
                    that.isActive = false;
                    that.currentState = Characteristic.CurrentVacuumState.IDLE;
                    that.vacuumService.getCharacteristic(Characteristic.Active).updateValue(false);
                    that.vacuumService.getCharacteristic(Characteristic.CurrentVacuumState).updateValue(that.currentState);
                    that.log("✓ Paused");
                }
                callback(error);
            });
        } else {
            callback();
        }
    },
    
    // ============================================
    // Additional Services
    // ============================================
    
    setEco: function(on, callback) {
        this.log("Eco mode (switch): " + on);
        this.ecoMode = on;
        this.robot.eco = on;
        callback();
    },
    
    getEco: function(callback) {
        callback(null, this.ecoMode);
    },
    
    setNoGoLines: function(on, callback) {
        this.log("NoGo lines: " + on);
        this.robot.noGoLines = on;
        callback();
    },
    
    getNoGoLines: function(callback) {
        callback(null, this.robot.noGoLines);
    },
    
    setSpotClean: function(on, callback) {
        let that = this;
        if (on) {
            let eco = this.ecoMode;
            this.log("Starting spot cleaning - Eco: " + eco);
            this.robot.startSpotCleaning(eco, 200, 200, 1, 'normal', function(error) {
                if (!error) {
                    that.currentState = Characteristic.CurrentVacuumState.CLEANING;
                    that.vacuumService.getCharacteristic(Characteristic.CurrentVacuumState).updateValue(that.currentState);
                    setTimeout(function() {
                        that.vacuumRobotSpotCleanService.getCharacteristic(Characteristic.On).updateValue(false);
                    }, 1000);
                }
                callback(error);
            });
        } else {
            callback();
        }
    },
    
    getSpotClean: function(callback) {
        callback(null, false);
    },
    
    setFindMe: function(on, callback) {
        let that = this;
        if (on) {
            this.robot.findMe(function(error) {
                if (!error) {
                    setTimeout(function() {
                        that.vacuumRobotFindMeService.getCharacteristic(Characteristic.On).updateValue(false);
                    }, 1000);
                }
                callback(error);
            });
        } else {
            callback();
        }
    },
    
    getFindMe: function(callback) {
        callback(null, false);
    },
    
    setEmptyDustbin: function(on, callback) {
        let that = this;
        if (on) {
            this.robot.emptyDustbin(function(error) {
                if (!error) {
                    setTimeout(function() {
                        that.vacuumRobotEmptyDustbinService.getCharacteristic(Characteristic.On).updateValue(false);
                    }, 1000);
                }
                callback(error);
            });
        } else {
            callback();
        }
    },
    
    getEmptyDustbin: function(callback) {
        callback(null, false);
    },
    
    setZoneCleaning: function(zoneUuid, zoneName, on, callback) {
        if (on) {
            this.log("Starting zone cleaning: " + zoneName);
            this.startCleaning(zoneUuid, callback);
        } else {
            callback();
        }
    },
    
    getZoneCleaning: function(callback) {
        callback(null, false);
    }
};

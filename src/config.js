const path = require('path');
const os = require('os');
const fs = require('fs');

class Config {

  configFilePath = path.join(os.homedir(), '.base');

  defaultConfig = {

  }

  create(config) {
    config = config || this.defaultConfig;
    fs.writeFileSync(this.configFilePath, JSON.stringify(config));
  }

  read() {
    const config = fs.readFileSync(this.configFilePath, 'utf8');
    return JSON.parse(config);
  }

  get(key) {
    return this.read()[key];
  }

  set(key, value) {
    const config = this.read();
    config[key] = value;
    fs.writeFileSync(this.configFilePath, JSON.stringify(config));
  }
}

module.exports = Config;

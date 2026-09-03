const { withStringsXml } = require('@expo/config-plugins');

module.exports = function withAppName(config) {
  return withStringsXml(config, (config) => {
    if (!config.modResults.resources) {
      config.modResults.resources = {};
    }
    if (!config.modResults.resources.string) {
      config.modResults.resources.string = [];
    }
    const strings = config.modResults.resources.string;
    const appNameItem = strings.find((item) => item.$ && item.$.name === 'app_name');
    if (appNameItem) {
      appNameItem._ = 'અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા';
    } else {
      strings.push({ $: { name: 'app_name' }, _: 'અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા' });
    }
    return config;
  });
};

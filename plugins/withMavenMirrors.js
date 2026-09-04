const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withMavenMirrors(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const mirrors = `maven { url 'https://maven-central.storage-download.googleapis.com/maven2/' }\n    maven { url 'https://maven.aliyun.com/repository/public' }\n    mavenCentral()`;
    if (contents && !contents.includes('maven-central.storage-download.googleapis.com')) {
      contents = contents.replace(/mavenCentral\(\)/g, mirrors);
      config.modResults.contents = contents;
    }
    return config;
  });
};

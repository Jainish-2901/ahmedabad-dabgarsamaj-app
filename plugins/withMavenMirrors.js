const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withMavenMirrors(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const mirrors = `maven { url 'https://repo1.maven.org/maven2/' }\n    maven { url 'https://maven.aliyun.com/repository/public' }\n    mavenCentral()`;
    if (contents && !contents.includes('repo1.maven.org')) {
      contents = contents.replace(/mavenCentral\(\)/g, mirrors);
      config.modResults.contents = contents;
    }
    return config;
  });
};

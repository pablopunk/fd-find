const os = require('os')

const platform = os.platform()

module.exports.chooseAsset = function(asset) {
  switch (platform) {
    case 'linux':
    default:
      throw new Error(`Unknown platform ${platform}`)
  }
}

const commandExists = require('command-exists')
const { exec } = require('child_process')

async function hasFdOnPath() {
  console.log('checking if fd exists on user path')

  if (await cmdExists('fd')) {
    return new Promise((resolve) => {
      exec('fd --help', (error, stdout) => {
        if (error) {
          console.error(error)
          process.exit(1)
        }

        resolve(stdout && stdout.includes('sharkdp/fd'))
      })
    })
  }

  return false
}

async function cmdExists(cmd) {
  try {
    return await commandExists(cmd)
  } catch (e) {
    // nothing
  }

  return false
}

module.exports = { hasFdOnPath, cmdExists }

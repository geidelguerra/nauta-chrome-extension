const { exec } = require('child_process');

module.exports = {
  checkVPNStatus() {
    return new Promise((resolve, reject) => {
      exec('expressvpn status', (error, stdout) => {
        if (error) {
          return reject(error)
        }

        if (/Connected to/.test(stdout)) {
          return resolve({ status: 'connected' })
        }

        return resolve({ status: 'disconnected' })
      })
    })
  }
}
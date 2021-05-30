const findTab = async (query) => {
  const tabs =  await chrome.tabs.query(query)

  return tabs.length > 0 ? tabs[0] : null
}

const connect = () => {
  console.log('[Popup] connect()')

  chrome.runtime.sendMessage({
    action: 'connect'
  })
}

const disconnect = () => {
  console.log('[Popup] disconnect()')

  chrome.runtime.sendMessage({
    action: 'disconnect'
  })
}

const saveCredentials = (credentials) => {
  chrome.storage.local.set(credentials)
}

const updateButtons = (connected) => {
  if (connected) {
    connectButton.style.display = 'none'
    disconnectButton.style.display = 'block'
  } else {
    connectButton.style.display = 'block'
    disconnectButton.style.display = 'none'
  }
}

const updateTimeLeft = (value) => {
  timeLeft.innerText = value
}

const updateLastConnectionAt = (date) => {
  lastConnectionAt.innerText = date ? luxon.DateTime.fromISO(date).toLocaleString(luxon.DateTime.DATETIME_MED_WITH_SECONDS) : null
}

const updateCredentialsInput = (credentials) => {
  usernameInput.value = credentials.username
  passwordInput.value = credentials.password
}

const updateTimeConnected = (value) => {
  if (value) {
    value = luxon.Duration.fromMillis(value)
    value = `${value.as('hours').toFixed(0)}h ${value.as('minutes').toFixed(0)}m`
  } else {
    value = '0h 0m'
  }

  timeConnected.innerText = value
}

const updateVPNStatus = (status) => {
  vpnStatus.innerText = status
}

const usernameInput = document.querySelector('input[name="username"]')
usernameInput.addEventListener('change', (event) => saveCredentials({ username: event.target.value }))

const passwordInput = document.querySelector('input[name="password"]')
passwordInput.addEventListener('change', (event) => saveCredentials({ password: event.target.value }))

const timeLeft = document.getElementById('time-left')
const lastConnectionAt = document.getElementById('last-connection-at')
const timeConnected = document.getElementById('time-connected')
const vpnStatus = document.getElementById('vpn-status')

const connectButton = document.getElementById('connect-button')
connectButton.addEventListener('click', connect)

const disconnectButton = document.getElementById('disconnect-button')
disconnectButton.addEventListener('click', disconnect)

chrome.storage.local.onChanged.addListener((changes) => {
  console.log('[Popup] Storage changed:', changes)

  if (changes.connected) {
    updateButtons(changes.connected.newValue)
  }

  if (changes.timeLeft) {
    updateTimeLeft(changes.timeLeft.newValue)
  }

  if (changes.lastConnectionAt) {
    updateLastConnectionAt(changes.lastConnectionAt.newValue)
  }

  if (changes.timeConnected) {
    updateTimeConnected(changes.timeConnected.newValue)
  }

  if (changes.vpnStatus) {
    updateVPNStatus(changes.vpnStatus.newValue)
  }
})

const init = (options) => {
  console.log('[Popup] init():b', options)

  updateCredentialsInput({ username: options.username, password: options.password })
  updateButtons(options.connected)
  updateTimeLeft(options.timeLeft)
  updateLastConnectionAt(options.lastConnectionAt)
  updateTimeConnected(options.timeConnected)
  updateVPNStatus(options.vpnStatus || '-')
}

chrome.storage.local.get(null, (options) => init(options))
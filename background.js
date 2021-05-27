const connect = async () => {
  const tab = await chrome.tabs.create({
    url: 'https://secure.etecsa.net:8443',
    active: false,
    pinned: true,
  })

  chrome.storage.local.set({ tabId: tab.id })
}

const disconnect = (tabId) => {
  chrome.scripting.executeScript({
    target: { tabId },
    function () {
      const params = [
        { name:'ATTRIBUTE_UUID', pattern: /ATTRIBUTE_UUID=([A-Z0-9]+)/ },
        { name: 'CSRFHW', pattern: /CSRFHW=([a-z0-9]+)/ },
        { name:'wlanuserip', pattern: /wlanuserip=([0-9.]+)/ },
        { name:'ssid', pattern: /ssid=()/ },
        { name:'loggerId', pattern: /loggerId=([0-9]+\+.+@nauta.com.cu)/ },
        { name:'domain', pattern: /domain=()/ },
        { name:'username', pattern: /username=(.+@nauta.com.cu)/ },
        { name:'wlanacname', pattern: /wlanacname=()/ },
        { name:'wlanmac', pattern: /wlanmac=()/ },
      ].map((prop) => {
        const match = prop.pattern.exec(document.body.innerHTML)

        let value = match ? match[1] : ''

        if (prop.name === 'loggerId') {
          value = value.replace('+', ' ')
        }

        return `${prop.name}=${value}`
      }).concat(['remove=1']).join('&')

      fetch('https://secure.etecsa.net:8443/LogoutServlet', {
        method: 'POST',
        cors: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        credentials: 'include',
        body: params
      })
        .then((response) => response.text())
        .then((text) => {
          if (text === 'logoutcallback(\'SUCCESS\');') {
            chrome.runtime.sendMessage({ action: 'disconnected' })
          }
        })
        .catch((error) => {
          console.error('error:', error)
        })
    }
  })
}

const login = (tabId) => {
  chrome.scripting.executeScript({
    target: { tabId },
    function () {
      chrome.storage.local.get(null, (options) => {
        document.querySelector('input[name="username"]').value = options.username
        document.querySelector('input[name="password"]').value = options.password
        document.querySelector('input[name="Enviar"]').click()
      })
    }
  })
}

const updateTimeLeft = (tabId) => {
  console.log('[Background] updateTimeLeft:', tabId)

  chrome.scripting.executeScript({
    target: { tabId },
    function () {
      setTimeout(() => {
        console.log('updateTimeLeft:', document.querySelector('#logout').innerText)
        chrome.storage.local.set({
          timeLeft: document.querySelector('#availableTime').innerText
        })
      }, 200)
    }
  })
}

const setConnectionStatus = (connected) => {
  let options = { connected }

  if (connected) {
    options = Object.assign({}, options, { lastConnectionAt: new Date().toISOString() })
  }

  chrome.storage.local.set(options)
}

const createTimeConnectedRefreshAlarm = () => {
  chrome.alarms.create('refresh-time-connected', {
    periodInMinutes: 1
  })
}

const clearTimeConnectedRefreshAlarm = () => {
  chrome.alarms.clear('refresh-time-connected')
}

const updateTimeConnected = () => {
  chrome.storage.local.get(null, (options) => {
    console.log('updateTimeConnected')

    chrome.storage.local.set({
      timeConnected: new Date() - new Date(options.lastConnectionAt)
    })
  })
}

const init = () => {
  chrome.tabs.query({ url: 'https://secure.etecsa.net:8443/web/online.do*' }, (tabs) => {
    if (tabs.length === 0) {
      setConnectionStatus(false)

      return
    }

    chrome.storage.local.get(null, (options) => {
      console.log('[Background] tabs:', tabs[0])

      if (options.tabId === tabs[0].id) {
        setConnectionStatus(true)
        createTimeConnectedRefreshAlarm()
      }
    })
  })
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('onInstalled')

  init()
})

chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] onStartup')

  init()
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('chrome.runtime.onMessage:', request, sender)

  if (request.action === 'connect') {
    connect()

    return
  }

  if (request.action === 'login') {
    login(sender.tab.id)

    return
  }

  if (request.action === 'disconnect') {
    chrome.storage.local.get(null, options => {
      if (options.tabId) {
        disconnect(options.tabId)
      }
    })

    return
  }

  if (request.action === 'disconnected') {
    setConnectionStatus(false)

    chrome.tabs.remove(sender.tab.id)
  }
})

chrome.storage.local.onChanged.addListener((changes) => {
  console.log('[Background] Storage changed:', changes)

  if (changes.connected) {
    if (changes.connected.newValue) {
      chrome.storage.local.get(null, (options) => {
        updateTimeLeft(options.tabId)
      })

      updateTimeConnected()
      createTimeConnectedRefreshAlarm()
    } else {
      clearTimeConnectedRefreshAlarm()
    }
  }
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('onUpdated:', tabId, changeInfo, tab)

  if (changeInfo.status !== 'complete') {
    return
  }

  chrome.storage.local.get(null, (options) => {
    if (options.tabId !== tabId) {
      return
    }

    if (tab.url === 'https://secure.etecsa.net:8443/') {
      return login(tabId)
    }

    if (tab.url.startsWith('https://secure.etecsa.net:8443/web/online.do')) {
      setConnectionStatus(true)
    }
  })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('onAlarm:', alarm)

  if (alarm.name === 'refresh-time-connected') {
    updateTimeConnected()
  }
})
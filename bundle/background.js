const openLoginPage = async () => {
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

      return fetch('https://secure.etecsa.net:8443/LogoutServlet', {
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
            return chrome.runtime.sendMessage({ name: 'disconnected' })
          }

          chrome.runtime.sendMessage({ name: 'disconnected', error: { message: text } })
        })
    },
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

const extractDataFromPage = (tabId) => {
  chrome.scripting.executeScript({
    target: { tabId },
    function () {
      setTimeout(() => {
        chrome.storage.local.set({
          username: document.querySelector('#logout td:nth-child(2)').innerText,
          timeConnected: document.querySelector('#onlineTime').innerText,
          timeLeft: document.querySelector('#availableTime').innerText
        })
      }, 100)
    },
  })
}

const refreshGeoLocation = () => {
  chrome.storage.local.set({ geoError: null })

  fetch('https://reallyfreegeoip.org/json/', {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    redirect: 'follow'
  })
    .then((response) => {
      if (!response.ok) {
        const error = new Error(response.statusText)
        error.response = response

        throw error
      }

      return response.json()
    })
    .then((geo) => {
      chrome.storage.local.set({ geo })
    })
    .catch((error) => {
      chrome.storage.local.set({ geoError: error })
    })
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('chrome.runtime.onMessage:', request, sender)

  if (request.name === 'connect') {
    chrome.storage.local.set({ status: 'connecting' })
    openLoginPage()

    return
  }

  if (request.name === 'disconnect') {
    chrome.storage.local.set({ status: 'disconnecting' })
    chrome.alarms.clear('refreshData')
    chrome.alarms.clear('refreshGeo')
    chrome.storage.local.get(null, options => disconnect(options.tabId))

    return
  }

  if (request.name === 'disconnected') {
    chrome.storage.local.set({ status: 'disconnected' })

    // Close tab
    chrome.storage.local.get(null, options => chrome.tabs.remove(options.tabId))
  }
})

chrome.storage.local.onChanged.addListener((changes) => {
  console.log('[Background] Storage changed:', changes)

  if (changes.status?.newValue === 'connected') {
    chrome.alarms.create('refreshData', { periodInMinutes: 1 })
    chrome.alarms.create('refreshGeo', { periodInMinutes: 5 })

    chrome.storage.local.get(null, (options) => {
      extractDataFromPage(options.tabId)
    })

    refreshGeoLocation()
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
      chrome.storage.local.set({ status: 'connecting' })

      return login(tabId)
    }

    if (tab.url.startsWith('https://secure.etecsa.net:8443/web/online.do')) {
      chrome.storage.local.set({ status: 'connected' })
    }
  })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Background alarm:', alarm)

  if (alarm.name === 'refreshData') {
    return chrome.storage.local.get(null, (options) => {
      extractDataFromPage(options.tabId)
    })
  }

  if (alarm.name === 'refreshGeo') {
    return refreshGeoLocation()
  }
})

console.log('Searching for active connection tab...')
chrome.tabs.query({ url: 'https://secure.etecsa.net:8443/web/online.do*' }, (tabs) => {
  if (tabs.length === 0) {
    console.log('No active connection tab found.')
    return chrome.storage.local.set({ status: 'disconnected' })
  }

  const tab = tabs[0]

  console.log('Active connection tab found: ', tab.id)
  chrome.storage.local.get(null, (options) => {
    if (options.tabId !== tab.id) {
      chrome.storage.local.set({ tabId: tab.id, status: 'connected' })
    }

    extractDataFromPage(tab.id)

    refreshGeoLocation()

    chrome.alarms.create('refreshData', { periodInMinutes: 1 })
    chrome.alarms.create('refreshGeo', { periodInMinutes: 5 })
  })
})
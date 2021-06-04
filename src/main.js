import { createApp } from 'vue'
import App from './App.vue'
import './assets/css/main.css'
import * as luxon from 'luxon'

createApp(App).use({
  install(app) {
    app.config.globalProperties.$dateTime = (value = null) => {
      if (value === null) {
        return luxon.DateTime
      }

      if (value instanceof Date) {
        return luxon.DateTime.fromJSDate(value)
      }

      if (typeof value === 'string') {
        return luxon.DateTime.fromISO(value)
      }

      if (typeof value === 'number') {
        return luxon.DateTime.fromMillis(value)
      }

      if (typeof value === 'object') {
        return luxon.DateTime.fromObject(value)
      }

      throw new Error(`Invalid date: ${value}`)
    }

    app.config.globalProperties.$duration = (value, isoTime = true) => {
      if (typeof value === 'string') {
        value = value.split(':')
        value = { hours: value[0], minutes: value[1], seconds: value[2] }
      }

      if (typeof value === 'object') {
        return luxon.Duration.fromObject(value)
      }

      if (typeof value === 'number') {
        return luxon.Duration.fromMillis(value)
      }

      throw new Error(`Invalid duration: ${value}`)
    }
  }
}).mount('#app')

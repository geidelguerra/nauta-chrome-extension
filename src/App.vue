<template>
  <div class="p-4 text-base w-72">
    <h3 class="mb-4 text-2xl font-bold text-center uppercase">
      Nauta
    </h3>
    <template v-if="['disconnecting', 'connected'].includes(status)">
      <div class="mb-4">
        <TextInput
          label="Username"
          :model-value="credentials.username"
          :disabled="true"
        />
      </div>
      <div class="mb-4">
        <TextInput
          label="Time connected"
          :model-value="formattedTimeConnected"
          :disabled="true"
        />
      </div>
      <div class="mb-4">
        <TextInput
          label="Time left"
          :model-value="formattedTimeLeft"
          :disabled="true"
        />
      </div>
      <template v-if="geo">
        <div class="mb-4">
          <TextInput
            label="IP"
            :model-value="geo.ip"
            :disabled="true"
          />
        </div>
        <div class="mb-4">
          <TextInput
            label="Location"
            :model-value="`${geo.country_name} (${geo.region_name})`"
            :disabled="true"
          />
        </div>
      </template>
      <Button
        class="w-full"
        :disabled="status === 'disconnecting'"
        @click="disconnect"
      >
        {{ status === 'disconnecting' ? 'Disconnecting..' : 'Disconnect' }}
      </Button>
    </template>
    <template v-if="['disconnected', 'connecting'].includes(status)">
      <form @submit.prevent="connect">
        <div class="mb-4">
          <TextInput
            v-model="credentials.username"
            :disabled="status === 'connecting'"
            :bordered="true"
            label="Username"
            placeholder="username@nauta.com.cu"
          />
        </div>
        <div class="mb-4">
          <TextInput
            v-model="credentials.password"
            :disabled="status === 'connecting'"
            :bordered="true"
            label="Password"
            type="password"
          />
        </div>
        <div>
          <Button
            type="submit"
            class="w-full"
            :disabled="status === 'connecting'"
          >
            {{ status === 'connecting' ? 'Connecting..' : 'Connect' }}
          </Button>
        </div>
      </form>
    </template>
  </div>
</template>

<script>
import TextInput from './components/TextInput.vue'
import Button from './components/Button.vue'

export default {
  components: {
    TextInput,
    Button,
  },
  data() {
    return {
      credentials: {
        username: null,
        password: null,
      },
      status: null,
      connectedAt: null,
      timeConnected: null,
      timeLeft: null,
      intervalID: null,
      geo: null
    }
  },
  computed: {
    formattedTimeConnected() {
      if (!this.timeConnected) {
        return null
      }

      const { hours, minutes } = this.$duration(this.timeConnected).shiftTo('hours', 'minutes')

      return `${hours.toFixed(0)}h ${minutes.toFixed(0)}m`
    },
    formattedTimeLeft() {
      if (!this.timeLeft) {
        return null
      }

      const { hours, minutes, seconds } = this.$duration(this.timeLeft).shiftTo('hours', 'minutes', 'seconds')

      return `${hours.toFixed(0)}h ${minutes.toFixed(0)}m ${seconds.toFixed(0)}s`
    }
  },
  watch: {
    'credentials': {
      deep: true,
      handler(val) {
        console.log('Frontend credentials changed:', val)
        chrome.storage.local.set({ ...val })
      }
    }
  },
  mounted() {
    console.log('Frontend mounted')

    chrome.storage.local.get(null, (options) => {
      console.log('Frontend options:', options)

      this.timeConnected = options.timeConnected
      this.timeLeft = options.timeLeft
      this.connectedAt = options.connectedAt
      this.status = options.status
      this.credentials = {
        username: options.username,
        password: options.password,
      }
      this.geo = options.geo
    })

    chrome.storage.local.onChanged.addListener((changes) => {
      console.log('Frontend options changed:', changes)

      if (changes.timeConnected) {
        this.timeConnected = changes.timeConnected.newValue
      }

      if (changes.timeLeft) {
        this.timeLeft = changes.timeLeft.newValue
      }

      if (changes.connectedAt) {
        this.connectedAt = changes.connectedAt.newValue
      }

      if (changes.status) {
        this.status = changes.status.newValue
      }

      if (changes.username) {
        this.credentials.username = changes.username.newValue
      }

      if (changes.password) {
        this.credentials.password = changes.password.newValue
      }

      if (changes.geo) {
        this.geo = changes.geo.newValue
      }
    })
  },
  methods: {
    connect() {
      chrome.runtime.sendMessage({ name: 'connect' })
    },
    disconnect() {
      chrome.runtime.sendMessage({ name: 'disconnect' })
    },
  }
}
</script>

<style>
#app {
  font-size: 16px;
}
</style>

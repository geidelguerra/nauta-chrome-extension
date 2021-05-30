#!/usr/bin/env node
const process = require('process');
const { checkVPNStatus } = require('./vpn')

function sendMessage(message) {
  const buffer = Buffer.from(JSON.stringify(message));

  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);

  process.stdout.write(Buffer.concat([header, buffer]))
}

function onMessage(message) {
  if (message.action === 'check-vpn') {
    return checkVPNStatus()
      .then((data) => sendMessage(data))
      .catch((error) => sendMessage({ error }))
  }
}

process.stdin.on('readable', () => {
  let input = []
  let chunk = null

  while (chunk = process.stdin.read()) {
    input.push(chunk)
  }

  input = Buffer.concat(input)

  const length = input.readUInt32LE(0) + 4

  if (input.length >= length) {
    onMessage(JSON.parse(input.slice(4, length).toString()))
  }
})

process.on('uncaughtException', (error) => {
  sendMessage({ error })
})
#!/usr/bin/env node
'use strict'

const url = require('url')
const http = require('http')
const debug = require('debug')('airplanejs')
const getPort = require('get-port')
const opn = require('opn')
const patterns = require('patterns')()
const rtlsdr = require('rtl-sdr')
const Demodulator = require('mode-s-demodulator')
const store = require('./lib/store')
const routes = require('./lib/routes')

const DEFAULT_RATE = 2000000
const DEFAULT_FREQ = 1090000000
const ASYNC_BUF_NUMBER = 12
const DATA_LEN = 16 * 16384 // 256k

process.on('SIGINT', exit)

const argv = require('minimist')(process.argv.slice(2))

if (argv.help || argv.h) {
  help()
  process.exit()
}
if (argv.version || argv.v) {
  console.log(require('./package').version)
  process.exit()
}

const noop = function () {}
const demodulator = new Demodulator()

// Connect to RTLSDR device
const dev = setupDevice()

// Start reading data from RTLSDR device
rtlsdr.read_async(dev, onData, noop, ASYNC_BUF_NUMBER, DATA_LEN)

// Start HTTP server
startServer()

function onData (data, len) {
  demodulator.process(data, len, onMsg)
}

function onMsg (msg) {
  store.addMessage(msg)
}

function setupDevice () {
  let gain = argv.gain || argv.g
  const findMaxGain = !('gain' in argv || 'g' in argv)
  const autoGain = argv['auto-gain'] || false
  const enableAgc = argv['enable-agc'] || false
  const devIndex = argv.device || argv.d || 0
  const freq = argv.frequency || argv.f || DEFAULT_FREQ

  const ppmError = 0
  const vendor = Buffer.alloc(256)
  const product = Buffer.alloc(256)
  const serial = Buffer.alloc(256)

  const deviceCount = rtlsdr.get_device_count()
  if (!deviceCount) {
    console.error('No supported RTLSDR devices found.')
    process.exit(1)
  }

  debug('Found %d device(s):', deviceCount)
  for (let j = 0; j < deviceCount; j++) {
    rtlsdr.get_device_usb_strings(j, vendor, product, serial)
    debug('%d: %s, %s, SN: %s %s', j, vendor, product, serial, j === devIndex ? '(currently selected)' : '')
  }

  const dev = rtlsdr.open(devIndex)
  if (typeof dev === 'number') {
    console.error('Error opening the RTLSDR device: %s', dev)
    process.exit(1)
  }

  // Set gain, frequency, sample rate, and reset the device
  rtlsdr.set_tuner_gain_mode(dev, autoGain ? 0 : 1)
  if (!autoGain) {
    if (findMaxGain) {
      // Find the maximum gain available
      const gains = new Int32Array(100)
      const numgains = rtlsdr.get_tuner_gains(dev, gains)
      gain = gains[numgains - 1]
      debug('Max available gain is: %d', gain / 10)
    }
    debug('Setting gain to: %d', gain / 10)
    rtlsdr.set_tuner_gain(dev, gain)
  } else {
    debug('Using automatic gain control')
  }

  rtlsdr.set_freq_correction(dev, ppmError)
  if (enableAgc) rtlsdr.set_agc_mode(dev, 1)
  rtlsdr.set_center_freq(dev, freq)
  rtlsdr.set_sample_rate(dev, DEFAULT_RATE)
  rtlsdr.reset_buffer(dev)
  debug('Gain reported by device: %d', rtlsdr.get_tuner_gain(dev) / 10)

  return dev
}

function startServer () {
  patterns.add('GET /', routes.index)
  patterns.add('GET /assets/{file}', routes.assets)
  patterns.add('GET /airlines', routes.airlines)
  patterns.add('GET /airports', routes.airports)
  patterns.add('GET /aircrafts', routes.aircrafts)

  const server = http.createServer(function (req, res) {
    debug('%s %s', req.method, req.url)

    const path = url.parse(req.url).pathname
    const match = patterns.match(req.method + ' ' + path)

    if (!match) {
      res.writeHead(404)
      res.end()
      return
    }

    const fn = match.value // expects the value to be a function
    req.params = match.params

    fn(req, res)
  })

  const customPort = argv.port || argv.p

  if (customPort) listen(customPort)
  else getPort({port: 3000}).then(listen)

  function listen (port) {
    server.listen(port, function () {
      const url = 'http://localhost:' + port
      if (argv.browser === false) {
        console.log('Server running at: %s', url)
      } else {
        console.log('Opening %s in your favorite browser...', url)
        opn(url)
      }
    })
  }
}

function help () {
  console.log('Usage:')
  console.log('  airplanejs [options]')
  console.log()
  console.log('Options:')
  console.log('  --help -h            Show this help')
  console.log('  --version -v         Output AirplaneJS version')
  console.log('  --device -d <index>  Select RTL dongle (default: 0)')
  console.log('  --frequency -f <hz>  Set custom frequency (default: 1090000000)')
  console.log('  --gain -g <gain>     Set custom tuner gain')
  console.log('  --auto-gain          Disable manual tuner gain (default: off)')
  console.log('  --enable-agc         Use Automatic Gain Control (default: off)')
  console.log('  --port -p <port>     Set custom HTTP server port (default: 3000)')
  console.log('  --no-browser         Disable automatic opening of default browser')
}

function exit () {
  console.log('Closing down RTL-SDR device...')
  rtlsdr.cancel_async(dev)
  rtlsdr.close(dev)
  process.exit()
}

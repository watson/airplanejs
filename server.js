#!/usr/bin/env node
'use strict'

const fs = require('fs')
const url = require('url')
const path = require('path')
const http = require('http')
const debug = require('debug')('airplanejs')
const getPort = require('get-port')
const opn = require('opn')
const patterns = require('patterns')()
const mime = require('mime-types')
const rtlsdr = require('rtl-sdr')
const Demodulator = require('mode-s-demodulator')
const AircraftStore = require('mode-s-aircraft-store')

const DEFAULT_RATE = 2000000
const DEFAULT_FREQ = 1090000000
const ASYNC_BUF_NUMBER = 12
const DATA_LEN = 16 * 16384 // 256k
const AUTO_GAIN = -100      // Use automatic gain
const MAX_GAIN = 999999     // Use max available gain

process.on('SIGINT', exit)

const argv = require('minimist')(process.argv.slice(2))
argv.openBrowser = argv.openBrowser !== false // default to true

const ASSETS_FILES = fs.readdirSync(path.join(__dirname, 'assets'))

const noop = function () {}
const demodulator = new Demodulator()
const store = new AircraftStore()

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

function setupDevice (opts) {
  opts = {
    gain: MAX_GAIN,
    dev_index: 0,
    enable_agc: true,
    freq: DEFAULT_FREQ
  }

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
    debug('%d: %s, %s, SN: %s %s', j, vendor, product, serial, j === opts.dev_index ? '(currently selected)' : '')
  }

  const dev = rtlsdr.open(opts.dev_index)
  if (typeof dev === 'number') {
    console.error('Error opening the RTLSDR device: %s', dev)
    process.exit(1)
  }

  // Set gain, frequency, sample rate, and reset the device
  rtlsdr.set_tuner_gain_mode(dev, opts.gain === AUTO_GAIN ? 0 : 1)
  if (opts.gain !== AUTO_GAIN) {
    if (opts.gain === MAX_GAIN) {
      // Find the maximum gain available
      const gains = new Int32Array(100)
      const numgains = rtlsdr.get_tuner_gains(dev, gains)
      opts.gain = gains[numgains - 1]
      debug('Max available gain is: %d', opts.gain / 10)
    }
    rtlsdr.set_tuner_gain(dev, opts.gain)
    debug('Setting gain to: %d', opts.gain / 10)
  } else {
    debug('Using automatic gain control.')
  }
  rtlsdr.set_freq_correction(dev, ppmError)
  if (opts.enable_agc) rtlsdr.set_agc_mode(dev, 1)
  rtlsdr.set_center_freq(dev, opts.freq)
  rtlsdr.set_sample_rate(dev, DEFAULT_RATE)
  rtlsdr.reset_buffer(dev)
  debug('Gain reported by device: %d', rtlsdr.get_tuner_gain(dev) / 10)

  return dev
}

function startServer () {
  patterns.add('GET /', function (req, res) {
    res.setHeader('Content-Type', 'text/html')
    fs.createReadStream(path.join(__dirname, 'assets', 'index.html')).pipe(res)
  })

  patterns.add('GET /assets/{file}', function (req, res) {
    const filename = req.params.file

    if (ASSETS_FILES.indexOf(filename) === -1) {
      res.writeHead(404)
      res.end()
      return
    }

    res.setHeader('Content-Type', mime.lookup(filename))
    fs.createReadStream(path.join(__dirname, 'assets', filename)).pipe(res)
  })

  patterns.add('GET /aircrafts', function (req, res) {
    const aircrafts = store
      .getAircrafts()
      .filter(function (aircraft) {
        // We only want to plot aircrafts that have a geolocation
        return aircraft.lat
      })
      .map(function (aircraft) {
        return {
          icao: aircraft.icao,
          count: aircraft.count,
          seen: aircraft.seen,
          lat: aircraft.lat,
          lng: aircraft.lng,
          altitude: aircraft.altitude,
          unit: aircraft.unit,
          heading: Math.round(aircraft.heading),
          speed: Math.round(aircraft.speed),
          callsign: aircraft.callsign
        }
      })
    const body = JSON.stringify(aircrafts)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Length', Buffer.byteLength(body))
    res.end(body)
  })

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

  if (argv.port) listen(argv.port)
  else getPort({port: 3000}).then(listen)

  function listen (port) {
    server.listen(port, function () {
      const url = 'http://localhost:' + port
      if (argv.openBrowser) {
        console.log('Opening %s in your favorite browser...', url)
        opn(url)
      } else {
        console.log('Server running at: %s', url)
      }
    })
  }
}

function exit () {
  console.log('Closing down RTL-SDR device...')
  rtlsdr.cancel_async(dev)
  rtlsdr.close(dev)
  process.exit()
}

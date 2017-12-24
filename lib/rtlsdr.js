'use strict'

const rtlsdr = require('rtl-sdr')
const Demodulator = require('mode-s-demodulator')
const debug = require('debug')('airplanejs')
const store = require('./store')

const DEFAULT_RATE = 2000000
const DEFAULT_FREQ = 1090000000
const ASYNC_BUF_NUMBER = 12
const DATA_LEN = 16 * 16384 // 256k

const noop = function () {}
const demodulator = new Demodulator()

let dev

exports.start = function (argv) {
  if (dev) throw new Error('Cannot start rtlsdr more than once')

  // Connect to RTLSDR device
  dev = setupDevice(argv)

  // Start reading data from RTLSDR device
  rtlsdr.read_async(dev, onData, noop, ASYNC_BUF_NUMBER, DATA_LEN)
}

exports.stop = function () {
  rtlsdr.cancel_async(dev)
  rtlsdr.close(dev)
}

function onData (data, len) {
  demodulator.process(data, len, onMsg)
}

function onMsg (msg) {
  store.addMessage(msg)
}

function setupDevice (argv) {
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

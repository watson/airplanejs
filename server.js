#!/usr/bin/env node
'use strict'

const url = require('url')
const http = require('http')
const debug = require('debug')('airplanejs')
const getPort = require('get-port')
const open = require('open')
const patterns = require('patterns')()
const rtlsdr = require('./lib/rtlsdr')
const routes = require('./lib/routes')

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

// Start radio
rtlsdr.start(argv)

patterns.add('GET /', routes.index)
patterns.add('GET /assets/{file}', routes.assets)
patterns.add('GET /airlines', routes.airlines)
patterns.add('GET /airports', routes.airports)
patterns.add('GET /routes', routes.routes)
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
      open(url)
    }
  })
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
  rtlsdr.stop()
  process.exit()
}

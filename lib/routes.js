'use strict'

const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')
const mime = require('mime-types')
const store = require('./store')

const ASSETS_FILES = fs.readdirSync(path.join(__dirname, '..', 'assets'))

exports.index = function (req, res) {
  res.setHeader('Content-Type', 'text/html')
  fs.createReadStream(path.join(__dirname, '..', 'assets', 'index.html')).pipe(res)
}

exports.assets = function (req, res) {
  const filename = req.params.file

  if (ASSETS_FILES.indexOf(filename) === -1) {
    res.writeHead(404)
    res.end()
    return
  }

  res.setHeader('Content-Type', mime.lookup(filename))
  fs.createReadStream(path.join(__dirname, '..', 'assets', filename)).pipe(res)
}

exports.airlines = function (req, res) {
  let first = true
  res.setHeader('Content-Type', 'application/json')

  fs.createReadStream(path.join(__dirname, '..', 'data', 'airlines.csv'))
    .pipe(csv(['id', 'name', 'alias', 'IATA', 'ICAO', 'callsign', 'country', 'active']))
    .on('error', function (err) {
      console.error(err.stack)
      if (first) res.writeHead(500)
      res.end()
    })
    .on('data', function (row) {
      Object.keys(row).forEach(function (key) {
        if (row[key] === '\\N') row[key] = null
      })
      row.id = Number.parseInt(row.id, 10)
      row.active = row.active === 'Y'

      // defunct airlines are not flying planes, so no need to return those
      if (!row.active) return

      res.write((first ? '[\n' : ',') + JSON.stringify(row) + '\n')
      first = false
    })
    .on('end', function () {
      res.end(']')
    })
}

exports.airports = function (req, res) {
  let first = true
  res.setHeader('Content-Type', 'application/json')

  fs.createReadStream(path.join(__dirname, '..', 'data', 'airports.csv'))
    .pipe(csv(['id', 'name', 'city', 'country', 'IATA', 'ICAO', 'lat', 'lng', 'altitude', 'utcOffset', 'DST', 'tz', 'type', 'source']))
    .on('error', function (err) {
      console.error(err.stack)
      if (first) res.writeHead(500)
      res.end()
    })
    .on('data', function (row) {
      Object.keys(row).forEach(function (key) {
        if (row[key] === '\\N') row[key] = null
      })
      row.id = Number.parseInt(row.id, 10)
      row.lat = row.lat ? Number.parseFloat(row.lat) : null
      row.lng = row.lng ? Number.parseFloat(row.lng) : null
      row.utcOffset = row.utcOffset ? Number.parseFloat(row.utcOffset) : null
      row.altitude = row.altitude ? Number.parseInt(row.altitude, 10) : null

      res.write((first ? '[\n' : ',') + JSON.stringify(row) + '\n')
      first = false
    })
    .on('end', function () {
      res.end(']')
    })
}

exports.routes = function (req, res) {
  let first = true
  res.setHeader('Content-Type', 'application/json')

  fs.createReadStream(path.join(__dirname, '..', 'data', 'routes.csv'))
    .pipe(csv(['airline', 'airlineId', 'source', 'sourceId', 'dest', 'destId', 'codeshare', 'stops', 'equipment']))
    .on('error', function (err) {
      console.error(err.stack)
      if (first) res.writeHead(500)
      res.end()
    })
    .on('data', function (row) {
      Object.keys(row).forEach(function (key) {
        if (row[key] === '\\N') row[key] = null
      })
      row.airlineId = Number.parseInt(row.airlineId, 10)
      row.sourceId = Number.parseInt(row.sourceId, 10)
      row.destId = Number.parseInt(row.destId, 10)
      row.codeshare = row.codeshare === 'Y'
      row.stops = Number.parseInt(row.stops, 10)

      res.write((first ? '[\n' : ',') + JSON.stringify(row) + '\n')
      first = false
    })
    .on('end', function () {
      res.end(']')
    })
}

exports.aircrafts = function (req, res) {
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
}

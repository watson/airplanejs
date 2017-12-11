'use strict'

const aircraftIndex = {}
const infoPanel = document.getElementById('info')
let map, selectedMarker, planeIcon, currentPosition

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(function (position) {
    const coords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    }
    // if map loaded faster than we could get the position, just re-center the map
    if (map) map.setCenter(coords)
    // else store the users position so that the map can use it when it's loaded
    else currentPosition = coords
  })
}

// eslint-disable-next-line no-unused-vars
function initMap () {
  planeIcon = {
    path: 'M482,363.333c2.667,0.666,5,0.332,7-1c2-1.334,3-3.334,3-6v-36c0-6.668-3-12-9-16l-187-111 c-6-3.334-9-8.668-9-16v-125c0-6.667-1.333-13-4-19c-7.333-18.667-17.667-29-31-31c-2-0.667-4-1-6-1s-4.333,0.333-7,1 c-0.667,0-1.5,0.167-2.5,0.5s-2.167,0.833-3.5,1.5c-4.667,1.333-9,4.333-13,9s-7,9-9,13l-3,7c-2,6-3,12.333-3,19v125 c0,7.333-3,12.667-9,16l-187,111c-6,4-9,9.332-9,16v36c0,2.666,1,4.666,3,6c2,1.332,4.333,1.666,7,1l185-60 c2.667-1.334,5-1.168,7,0.5c2,1.666,3,3.832,3,6.5v97c0,7.334-2.667,13-8,17l-25,18c-5.333,4-8,9.666-8,17v24c0,2.666,1,4.666,3,6 s4.333,1.666,7,1l62-18c6.667-2,13.333-2,20,0l62,18c2.667,0.666,5,0.334,7-1s3-3.334,3-6v-24c0-7.334-2.667-13-8-17l-25-18 c-5.333-4-8-9.666-8-17v-97c0-3.334,1-5.668,3-7c2-1.334,4.333-1.334,7,0L482,363.333z',
    anchor: new google.maps.Point(246, 246), // eslint-disable-line no-undef
    fillColor: '#010002',
    fillOpacity: 0.8,
    scale: 0.05,
    strokeColor: 'red',
    strokeWeight: 0
  }

  // eslint-disable-next-line no-undef
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 9,
    center: currentPosition
      ? new google.maps.LatLng(currentPosition.lat, currentPosition.lng) // eslint-disable-line no-undef
      : new google.maps.LatLng(48.9062802, 2.3598659) // eslint-disable-line no-undef
  })

  setInterval(function () {
    // eslint-disable-next-line no-undef
    $.getJSON({url: 'aircrafts', type: 'GET', success: plotAircrafts})
  }, 2000)
}

function plotAircrafts (aircrafts) {
  aircrafts.forEach(function (_aircraft) {
    const aircraft = aircraftIndex[_aircraft.icao] = aircraftIndex[_aircraft.icao] || new Aircraft()
    aircraft.update(_aircraft)
  })
  pruneMarkers()
}

function pruneMarkers () {
  const threshold = Date.now() - 120000 // prune all aircrafts we haven't seen in two minutes
  aircrafts().forEach(function (aircraft) {
    if (aircraft.seen < threshold) {
      if (aircraft.marker === selectedMarker) {
        infoPanel.style.display = 'none'
      }
      aircraft.flightPath.setMap(null)
      aircraft.marker.setMap(null)
      delete aircraftIndex[aircraft.icao]
    }
  })
}

function onAircraftClick () {
  selectedMarker = this

  aircrafts().forEach(function (aircraft) {
    const icon = aircraft.marker.getIcon()
    if (aircraft.marker === selectedMarker) {
      icon.strokeWeight = 1
      aircraft.flightPath.setPath(aircraft.flightPathCoords)
      aircraft.flightPath.setVisible(true)
      infoPanel.innerHTML = aircraft.toHTML()
    } else {
      icon.strokeWeight = 0
      aircraft.flightPath.setVisible(false)
    }
    aircraft.marker.setIcon(icon)
  })

  infoPanel.style.display = 'block'
}

function aircrafts () {
  return Object.keys(aircraftIndex).map(function (icao) {
    return aircraftIndex[icao]
  })
}

function Aircraft () {
  this.flightPathCoords = []
  // eslint-disable-next-line no-undef
  this.flightPath = new google.maps.Polyline({
    geodesic: true,
    strokeColor: '#ff0000',
    strokeOpacity: 1.0,
    strokeWeight: 2,
    visible: false
  })
  this.flightPath.setMap(map)
}

Aircraft.prototype.update = function (aircraft) {
  this.icao = aircraft.icao
  this.seen = aircraft.seen
  this.lat = aircraft.lat
  this.lng = aircraft.lng
  this.altitude = aircraft.altitude
  this.unit = aircraft.unit
  this.heading = aircraft.heading
  this.speed = aircraft.speed
  this.callsign = aircraft.callsign

  // eslint-disable-next-line no-undef
  const pos = new google.maps.LatLng(this.lat, this.lng)

  this.flightPathCoords.push(pos)

  planeIcon.rotation = this.heading
  planeIcon.strokeWeight = 0

  if (this.marker) {
    if (this.marker === selectedMarker) {
      planeIcon.strokeWeight = 1
      this.flightPath.setPath(this.flightPathCoords)
      infoPanel.innerHTML = this.toHTML()
    }
    this.marker.setPosition(pos)
    this.marker.setIcon(planeIcon)
  } else {
    // eslint-disable-next-line no-undef
    this.marker = new google.maps.Marker({
      position: pos,
      map: map,
      icon: planeIcon,
      title: this.callsign
    })
    this.marker.addListener('click', onAircraftClick)
  }
}

Aircraft.prototype.toHTML = function () {
  const unit = this.unit === 0 ? 'ft' : 'm'
  const altitude = Number.isFinite(this.altitude) ? this.altitude + ' ' + unit : 'Unknown'
  const speed = Number.isFinite(this.speed) ? this.speed + ' kts' : 'Unknown'
  const track = Number.isFinite(this.heading) ? this.heading + '°' : 'Unknown'

  let html = `
    <dl>
      <dt>Call sign</dt>
      <dd>${this.callsign || 'Unknown'}</dd>
      <dt>Altitude</dt>
      <dd>${altitude}</dd>
      <dt>Ground speed</dt>
      <dd>${speed}</dd>
      <dt>Track</dt>
      <dd>${track}</dd>
    </dl>
  `

  if (this.callsign) {
    // Use noreferrer because Flightradar24.com would otherwise respond with 418
    html += `
      <a href="https://www.flightradar24.com/${this.callsign}" rel="noreferrer">Flightradar24.com</a>
    `
  }

  return html
}

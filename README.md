# AirplaneJS

📡 ✈️ An ADS-B receiver which plots nearby airplanes on a map live.

![Map with aircrafts plottet](https://user-images.githubusercontent.com/10602/33808194-7cca8eda-dde2-11e7-8542-e09d9e600791.png)

[![Build status](https://travis-ci.org/watson/airplanejs.svg?branch=master)](https://travis-ci.org/watson/airplanejs)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Prerequisites

This software requires an [RTL-SDR USB
dongle](https://www.rtl-sdr.com/buy-rtl-sdr-dvb-t-dongles/) in order
run.

This software also requires that you have
[librtlsdr](https://github.com/steve-m/librtlsdr) installed on your
system. In turn librtlsdr requires [libusb](http://libusb.info/).

You can install librtlsdr with most package managers which will ensure
you have the right dependencies.

Homebrew (macOS):

```
brew install librtlsdr
```

Debian based Linux distros:

```
apt-get install librtlsdr-dev
```

## Usage

```
npx airplanejs
```

This should open your default browser at
[http://localhost:3000](http://localhost:3000).

Alternative approach:

1. Install AirplaneJS globally:
   ```
   npm install airplanejs -g
   ```
1. Run AirplaneJS:
   ```
   airplanejs
   ```

## License

MIT

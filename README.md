# AirplaneJS

📡 ✈️ An SDR app written in JavaScript that picks up ADS-B radio signals from airplanes and plots them in real time on a map in your browser ✨🐢🚀✨

![Map with aircrafts plottet](https://user-images.githubusercontent.com/10602/33808194-7cca8eda-dde2-11e7-8542-e09d9e600791.png)

[![Build status](https://travis-ci.org/watson/airplanejs.svg?branch=master)](https://travis-ci.org/watson/airplanejs)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Prerequisites

### Hardware

This software requires an [RTL-SDR USB dongle with an RTL2832U
chip][az-search] in order run. Here's a few that I like:

- [RTL-SDR.com dongle with 2x telescopic antennas][az-d1]
- [Very tiny and cheap no-name RTL2832U dongle with an antenna][az-d2]
- Or just [search Amazon for RTL2832U dongles][az-search]

*Disclaimer: I'm trying out the Amazon Affiliate Program to support my
free open source work. So if you decide to buy an RTL-SDR dongle using
one of the links above I'll be grateful (the search link should work as
well).*

For more information about buying RTL-SDR dongles, check out the
[RTL-SDR.com blog buyers
guide](https://www.rtl-sdr.com/buy-rtl-sdr-dvb-t-dongles/).

### Software

This software also requires that you have [Node.js](https://nodejs.org)
and [librtlsdr](https://github.com/steve-m/librtlsdr) installed on your
system. You can install librtlsdr with most package managers which will
ensure you have the right dependencies.

Homebrew (macOS):

```
brew install librtlsdr
```

Debian based Linux distros:

```
apt-get install librtlsdr-dev
```

## Usage

The easiest way to run AirplaneJS is using the `npx` command that you'll
have availble if you have Node.js 8+ installed. Simply plug in your
RTL-SDR dongle and type:

```
npx airplanejs
```

This will download and run AirplaneJS without any hassle.

When AirplaneJS successfully have connected to the USB dongle, your
default browser should automatically open to
[http://localhost:3000](http://localhost:3000).

Alternatively install the module globally like in the old days:

1. Install AirplaneJS globally:
   ```
   npm install airplanejs -g
   ```
1. Run AirplaneJS:
   ```
   airplanejs
   ```

### Options

The following options are available when running `airplanejs`:

- `--help` - Show help (alias: `-h`)
- `--version` - Output AirplaneJS version (alias: `-v`)
- `--device <index>` - Select RTL dongle (alias: `-d`, default: `0`)
- `--frequency <hz>` - Set custom frequency (alias: `-f`, default: `1090000000`)
- `--gain <gain>` - Set custom tuner gain (alias: `-g`)
- `--auto-gain` - Disable manual tuner gain (default: off)
- `--enable-agc` - Use Automatic Gain Control (default: off)
- `--port <port>` - Set custom HTTP server port (alias: `-p`, default: `3000`)
- `--no-browser` - Disable automatic opening of default browser

## License

MIT

[az-search]: https://www.amazon.com/gp/search/ref=as_li_qf_sp_sr_tl?ie=UTF8&tag=wa7son-20&keywords=RTL2832U&index=aps&camp=1789&creative=9325&linkCode=ur2&linkId=90c68a1417396c5538f5f30ca8ff74d0
[az-d1]: https://www.amazon.com/gp/product/B011HVUEME/ref=as_li_tl?ie=UTF8&camp=1789&creative=9325&creativeASIN=B011HVUEME&linkCode=as2&tag=wa7son-20&linkId=ae47931667148dc42699cd9c9705422e
[az-d2]: https://www.amazon.com/gp/product/B076H4MQBQ/ref=as_li_tl?ie=UTF8&camp=1789&creative=9325&creativeASIN=B076H4MQBQ&linkCode=as2&tag=wa7son-20&linkId=54c7091aa09eb38e512351437cdf43b8

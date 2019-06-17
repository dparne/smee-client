const validator = require('validator')
const EventSource = require('eventsource')
const url = require('url')
const querystring = require('querystring')
const axios = require('axios')

class Client {
  constructor ({ source, target, logger = console }) {
    this.source = source
    this.target = target
    this.logger = logger

    if (!validator.isURL(this.source)) {
      throw new Error('The provided URL is invalid.')
    }
  }

  async onmessage (msg) {
    const data = JSON.parse(msg.data)
    const request = {}

    Object.assign(request, data)

    const target = url.parse(this.target, true)
    const mergedQuery = Object.assign(target.query, data.query)
    target.search = querystring.stringify(mergedQuery)

    delete data.query
    delete data.body

    const headers = {}

    Object.keys(data).forEach(key => {
      headers[key] = data[key]
    })

    this.logger.info(`Headers ${JSON.stringify(headers)}`)

    try {
      let response = await axios.post(target, request.body, {headers});
      this.logger.info(response)
    } catch (err) {
      this.logger.error(err)
    }
      
  }

  onopen () {
    this.logger.info('Connected', this.events.url)
  }

  onerror (err) {
    this.logger.error(err)
  }

  start () {
    const events = new EventSource(this.source)

    // Reconnect immediately
    events.reconnectInterval = 0

    events.addEventListener('message', this.onmessage.bind(this))
    events.addEventListener('open', this.onopen.bind(this))
    events.addEventListener('error', this.onerror.bind(this))

    this.logger.info(`Forwarding ${this.source} to ${this.target}`)
    this.events = events

    return events
  }
}

Client.createChannel = async () => {
  return superagent.head('https://smee.io/new').redirects(0).catch((err, res) => {
    return err.response.headers.location
  })
}

module.exports = Client

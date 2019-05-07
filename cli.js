const { request } = require('https')

const req = request(
  {
    hostname: 'api.github.com',
    path: '/repos/sharkdp/fd/releases/latest',
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3'
    }
  },
  res => {
    let data = ''

    console.log(res.statusCode)

    res.on('data', _ => (data += _))
    res.on('end', _ => {
      let { assets } = JSON.parse(data)
    })
  }
)

req.on('error', console.log)

req.end()

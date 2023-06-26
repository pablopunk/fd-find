const { request } = require('https')
const os = require('os')
const { exec } = require('child_process')
const { hasFdOnPath, cmdExists } = require('./utils')

const platform = os.platform()

const platformFiles = {
  linux: 'x86_64-unknown-linux-gnu',
  darwin: 'apple-darwin',
}

const chooseAsset = (assets) => {
  if (!platformFiles.hasOwnProperty(platform)) {
    throw new Error(`Couldn't find any asset for platform '${platform}''`)
  }

  const asset = assets.find((_) => _.name.includes(platformFiles[platform]))

  if (!asset) {
    throw new Error(`Couldn't find any asset for platform '${platform}''`)
  }

  return asset
}

const downloadAsset = async (asset) => {
  if (await hasFdOnPath()) {
    console.log('fd present on OS... nothing to do')
    process.exit(0)
  }

  const distFolder = `${__dirname}/dist`
  const untarFolder = `${distFolder}/${asset.name.replace('.tar.gz', '')}`

  if (!(await cmdExists('wget'))) {
    console.error('wget is required to download fd-find')
    process.exit(1)
  }

  exec(
    `
    mkdir -p ${distFolder} && \
    wget ${asset.browser_download_url} -O ${distFolder}/download.tar.gz && \
    tar xzf ${distFolder}/download.tar.gz -C ${distFolder}/ && \
    mv ${untarFolder}/fd ${distFolder}/fd && \
    rm -rf ${untarFolder} ${distFolder}/download.tar.gz
  `,
    (error) => {
      if (error) {
        throw error
      }
    }
  )
}

const req = request(
  {
    hostname: 'api.github.com',
    path: '/repos/sharkdp/fd/releases/latest',
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    },
  },
  (res) => {
    let data = ''

    res.on('data', (_) => (data += _))
    res.on('end', async (_) => {
      let { assets } = JSON.parse(data)

      if (!assets) {
        console.error('unable to find any assets from sharkdp/fd')
        process.exit(1)
      }

      const asset = chooseAsset(assets)
      await downloadAsset(asset)
    })
  }
)

req.on('error', console.log)

req.end()

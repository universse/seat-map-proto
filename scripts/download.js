const fs = require('fs')
const { promisify } = require('util')

const writeFile = promisify(fs.writeFile)

function createRestRequest(fetch = global.fetch) {
  return async function restRequest(url, options = {}) {
    const { headers, body, ...others } = options

    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body && { body: JSON.stringify(body) }),
      ...others,
    })

    const result = await response.json()

    return response.ok ? result : Promise.reject(result)
  }
}

const restRequest = createRestRequest(require('node-fetch'))

const overviewId = '567:45185'

restRequest(
  `https://api.figma.com/v1/files/MVuVGa6uvlRX1j6TdN0catmn/nodes?ids=${overviewId}&geometry=paths`,
  {
    headers: {
      'x-figma-token': '159060-baa471f1-8047-4830-9fd1-34158e13f20a',
    },
  }
).then(async (res) => {
  const {
    size: { x: width, y: height },
    children,
  } = res.nodes[overviewId].document
  const areas = []

  for (const {
    name,
    relativeTransform: [[, , x], [, , y]],
    size: { x: width, y: height },
  } of children) {
    areas.push({ id: name.replace(':', '-'), x, y, width, height })
  }

  await Promise.all(
    children.map(({ name }) => {
      return restRequest(
        `https://api.figma.com/v1/files/MVuVGa6uvlRX1j6TdN0catmn/nodes?ids=${name}&geometry=paths`,
        {
          headers: {
            'x-figma-token': '159060-baa471f1-8047-4830-9fd1-34158e13f20a',
          },
        }
      ).then((res) => {
        const {
          relativeTransform: [[, , originX], [, , originY]],
          children,
        } = res.nodes[name].document

        const seats = []

        for (const {
          relativeTransform: [[, , x], [, , y]],
        } of children) {
          seats.push({ x, y })
        }

        return writeFile(
          `./data/areas/${name.replace(':', '-')}.json`,
          JSON.stringify({ originX, originY, seats })
        )
      })
    })
  )

  fs.writeFileSync(
    './data/overview/1.json',
    JSON.stringify({
      svgProps: { width, height },
      areas,
    })
  )

  process.exit(0)
})

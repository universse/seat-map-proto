import { restRequest } from '../../nodeUtils/restRequest'

export function fetchOverviewMap(id = '1') {
  return restRequest(`/api/getOverview/${id}`)
    .then(({ areas, svgProps }) => {
      const overviewHtmlArray = []

      for (const { id, x, y, width, height } of areas) {
        overviewHtmlArray.push(
          `<rect id='${id}' x='${x}' y='${y}' width='${width}' height='${height}' fill='#39A5F2'></rect>`
        )
      }

      return {
        svgProps,
        overviewHtml: overviewHtmlArray.join(''),
      }
    })
    .catch(console.log)
}

const RADIUS = 12
const STROKE_WIDTH = 4

const SIZE = RADIUS * 2 + STROKE_WIDTH
const HALF_SIZE = SIZE / 2

export function fetchArea(areaId) {
  return restRequest('/api/getSeats', { body: { id: areaId } }).then(
    ({ originX, originY, seats }) => {
      const areaHtmls = []

      for (const { x, y } of seats) {
        areaHtmls.push(
          `<circle cx='${originX + x + HALF_SIZE}' cy='${
            originY + y + HALF_SIZE
          }' r='${RADIUS}'></circle>`
        )
      }

      return areaHtmls.join('')
    }
  )
}

function fakeLatency() {
  return new Promise((resolve) =>
    setTimeout(
      resolve,
      // Math.random() * 3000 + 500
      5000
    )
  )
}

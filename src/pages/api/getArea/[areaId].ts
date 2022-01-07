const path = require(`path`)
const fs = require(`fs`)

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export default async function getArea(req, res) {
  await sleep(1000)

  res.setHeader(`Cache-Control`, `s-maxage=300, stale-while-revalidate`)

  res
    .status(200)
    .json(
      fs.readFileSync(
        path.resolve(`data/areas/`, `${req.query.areaId}.json`),
        `utf-8`
      )
    )
}

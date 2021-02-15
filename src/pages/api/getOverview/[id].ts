const path = require('path')
const fs = require('fs')

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export default async function getOverview(req, res) {
  await sleep(3000)
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
  res
    .status(200)
    .json(
      fs.readFileSync(
        path.resolve('data/overview/', `${req.query.id}.json`),
        'utf-8'
      )
    )
}

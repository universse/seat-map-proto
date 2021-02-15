async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export default async function getOverview(req, res) {
  await sleep(3000)
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate')
  res.status(200).json(require(`../../../data/overview/${req.body.id}.json`))
}

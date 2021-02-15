export default function getOverview(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, must-revalidate')
  res.status(200).json(require(`../../../data/overview/${req.body.id}.json`))
}

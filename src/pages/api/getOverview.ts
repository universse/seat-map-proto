export default function getOverview(req, res) {
  res.status(200).json(require(`../../../data/overview/${req.body.id}.json`))
}

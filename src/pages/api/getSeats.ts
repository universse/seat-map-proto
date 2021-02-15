export default function getSeats(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, must-revalidate')
  res.status(200).json(require(`../../../data/areas/${req.body.id}.json`))
}

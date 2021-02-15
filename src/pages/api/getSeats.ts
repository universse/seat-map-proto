export default function getSeats(req, res) {
  res.status(200).json(require(`../../../data/areas/${req.body.id}.json`))
}

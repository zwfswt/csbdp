const app = require('./app')
const { port } = require('./config')

app.listen(port, () => {
  console.log(`CSBDP backend listening on http://127.0.0.1:${port}`)
})

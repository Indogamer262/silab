const express = require('express')
const app = express()
const router = require('./routes/web')

app.set('view engine', 'ejs')
app.use(router)

const PORT = 5000
app.listen(PORT, () => {
 console.log(`Server is running at port ${PORT}`)
})
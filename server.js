import express from 'express'
import router from './routes/web.js'

const app = express()

app.set('view engine', 'pug')
app.use(express.static('public'))
app.use(router)

const PORT = 5000
app.listen(PORT, () => {
 console.log(`Server is running at port ${PORT}`)
})
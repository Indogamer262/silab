const express = require('express')
const router = express.Router()

router.use(express.urlencoded({extended: false}))

router.post('/receiver', (req, res) => {
    const name = req.body.name
    const email = req.body.email
    //res.status(200).render('received', {name, email})
})

router.get('/form', (req, res) => {
    //res.status(200).render('forms')
})

router.get('/', (req, res) => {
   // res.status(200).render('index')
})


module.exports = router
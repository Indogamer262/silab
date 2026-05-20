import express from 'express'
const router = express.Router()

router.use(express.urlencoded({extended: false}))

router.get('/', (req, res) => {
    res.render('index', { title: 'Selamat Datang' })
})

router.get('/login', (req, res) => {
    res.render('login', { title: 'Login SILAB' })
})

router.post('/login', (req, res) => {
    // Logika autentikasi Prisma akan di sini nanti
    res.redirect('/dashboard')
})

router.get('/dashboard', (req, res) => {
    res.render('dashboard', { title: 'Dashboard', user: { name: 'User', role: 'ADMIN' } })
})

export default router
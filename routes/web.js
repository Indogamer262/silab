import express from 'express'
import { showLogin, processLogin, logout } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.use(express.urlencoded({ extended: false }))

// ─── Halaman Utama ────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard')
    }
    res.render('index', { title: 'Selamat Datang' })
})

// ─── Autentikasi ─────────────────────────────────────────────────────────────
router.get('/login', showLogin)
router.post('/login', processLogin)
router.post('/logout', requireAuth, logout)

// ─── Route Terproteksi ────────────────────────────────────────────────────────
router.get('/dashboard', requireAuth, (req, res) => {
    res.render('dashboard', {
        title: 'Dashboard',
        user: res.locals.user,
    })
})

export default router
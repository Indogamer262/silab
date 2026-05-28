import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import router from './routes/web.js'

const app = express()

// ─── View Engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'pug')

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static('public'))

// ─── Session ─────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'silab-dev-secret-ganti-di-produksi',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8, // 8 jam
  },
}))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use(router)

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Halaman Tidak Ditemukan',
    message: 'Halaman yang Anda cari tidak dapat ditemukan.',
    statusCode: 404,
  })
})

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).render('error', {
    title: 'Kesalahan Server',
    message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
    statusCode: 500,
  })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`)
})
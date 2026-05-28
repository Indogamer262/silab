import prisma from '../lib/prisma.js'
import bcrypt from 'bcryptjs'

/**
 * GET /login
 * Tampilkan halaman login. Redirect ke dashboard jika sudah login.
 */
export const showLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard')
  }
  res.render('login', {
    title: 'Login SILAB',
    error: req.session.loginError ?? null,
  })
  // Hapus error setelah ditampilkan (flash-like behavior)
  delete req.session.loginError
}

/**
 * POST /login
 * Proses autentikasi: cari user berdasarkan email, verifikasi password.
 */
export const processLogin = async (req, res) => {
  const { email, password } = req.body

  // Validasi input dasar
  if (!email || !password) {
    req.session.loginError = 'Email dan password wajib diisi.'
    return res.redirect('/login')
  }

  try {
    // Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
      },
    })

    // Jika user tidak ditemukan
    if (!user) {
      req.session.loginError = 'Email atau password salah.'
      return res.redirect('/login')
    }

    // Verifikasi password dengan bcrypt
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      req.session.loginError = 'Email atau password salah.'
      return res.redirect('/login')
    }

    // Simpan data user ke session (tanpa password)
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }

    // Regenerate session ID untuk mencegah session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err)
        req.session.loginError = 'Terjadi kesalahan. Silakan coba lagi.'
        return res.redirect('/login')
      }
      // Simpan ulang data user setelah regenerate
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
      res.redirect('/dashboard')
    })
  } catch (err) {
    console.error('Login error:', err)
    req.session.loginError = 'Terjadi kesalahan server. Silakan coba lagi.'
    res.redirect('/login')
  }
}

/**
 * POST /logout
 * Hapus session dan redirect ke halaman login.
 */
export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err)
    }
    res.clearCookie('connect.sid')
    res.redirect('/login')
  })
}

import prisma from '../lib/prisma.js'
import bcrypt from 'bcryptjs'

/**
 * GET /login
 * Tampilkan halaman login. Redirect ke profile jika sudah login.
 */
export const showLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect('/profile')
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
      res.redirect('/profile')
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

/**
 * POST /change-password
 * Change password for the currently logged-in user.
 */
export const changePassword = async (req, res) => {
  const { current_password, password, password_confirmation } = req.body

  if (!current_password || !password || !password_confirmation) {
    req.session.flash = { error: 'Semua field password wajib diisi.' }
    return res.redirect('/profile')
  }

  if (password.length < 8) {
    req.session.flash = { error: 'Password baru minimal harus 8 karakter.' }
    return res.redirect('/profile')
  }

  if (password !== password_confirmation) {
    req.session.flash = { error: 'Password baru dan konfirmasi password tidak cocok.' }
    return res.redirect('/profile')
  }

  try {
    const userId = req.session.user.id

    // Get the user's current password hash from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    })

    if (!user) {
      req.session.flash = { error: 'Pengguna tidak ditemukan.' }
      return res.redirect('/profile')
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, user.password)
    if (!isMatch) {
      req.session.flash = { error: 'Password saat ini salah.' }
      return res.redirect('/profile')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    req.session.flash = { success: 'Password Anda berhasil diperbarui.' }
    res.redirect('/profile')
  } catch (err) {
    console.error('Change password error:', err)
    req.session.flash = { error: 'Terjadi kesalahan saat mengganti password.' }
    res.redirect('/profile')
  }
}


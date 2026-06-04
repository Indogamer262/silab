/**
 * Middleware untuk memproteksi route yang memerlukan login.
 * Redirect ke /login jika session tidak ada.
 */
export const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login')
  }
  // Inject user ke res.locals agar bisa diakses di semua view
  res.locals.user = req.session.user
  next()
}

/**
 * Middleware untuk membatasi akses berdasarkan role.
 * @param {...string} roles - Role yang diizinkan mengakses route
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login')
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).render('error', {
        title: 'Akses Ditolak',
        message: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
        statusCode: 403,
      })
    }
    next()
  }
}

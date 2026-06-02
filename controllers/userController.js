import prisma from '../lib/prisma.js'
import bcrypt from 'bcryptjs'

/** Enum values for the Role field */
const ROLES = ['ADMIN', 'LAB_HEAD', 'PRODI_HEAD', 'ADMIN_STAFF', 'LAB_STAFF']

/** Human-readable role labels */
const ROLE_LABELS = {
  ADMIN: 'Admin',
  LAB_HEAD: 'Kepala Lab',
  PRODI_HEAD: 'Kepala Prodi',
  ADMIN_STAFF: 'Staff Admin',
  LAB_STAFF: 'Staff Lab',
}

/**
 * GET /admin/users
 * List all users.
 */
export const index = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true },
    })
    res.render('admin/user/index', {
      title: 'Kelola Pengguna',
      user: res.locals.user,
      currentPath: '/admin/users',
      users,
      roleLabels: ROLE_LABELS,
      success: req.session.flash?.success ?? null,
      error: req.session.flash?.error ?? null,
    })
    delete req.session.flash
  } catch (err) {
    console.error('User index error:', err)
    res.status(500).render('error', {
      title: 'Kesalahan Server',
      message: 'Gagal memuat daftar pengguna.',
      statusCode: 500,
    })
  }
}

/**
 * GET /admin/users/create
 * Show create user form.
 */
export const create = (req, res) => {
  res.render('admin/user/create', {
    title: 'Tambah Pengguna',
    user: res.locals.user,
    currentPath: '/admin/users',
    roles: ROLES,
    roleLabels: ROLE_LABELS,
    error: req.session.flash?.error ?? null,
    old: req.session.flash?.old ?? {},
  })
  delete req.session.flash
}

/**
 * POST /admin/users
 * Validate and create a new user.
 */
export const store = async (req, res) => {
  const { id, name, email, role, password, password_confirmation } = req.body

  const idTrimmed = id?.trim() || ''
  const nameTrimmed = name?.trim() || ''
  const emailTrimmed = email?.trim() || ''
  const roleTrimmed = role?.trim() || ''

  const oldData = { id: idTrimmed, name: nameTrimmed, email: emailTrimmed, role: roleTrimmed }

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!idTrimmed || !nameTrimmed || !emailTrimmed || !roleTrimmed || !password) {
    req.session.flash = { error: 'Semua field wajib diisi.', old: oldData }
    return res.redirect('/admin/users/create')
  }

  if (idTrimmed.length > 7) {
    req.session.flash = { error: 'ID pengguna maksimal 7 karakter.', old: oldData }
    return res.redirect('/admin/users/create')
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailTrimmed)) {
    req.session.flash = { error: 'Format email tidak valid.', old: oldData }
    return res.redirect('/admin/users/create')
  }

  if (password.length < 8) {
    req.session.flash = { error: 'Password minimal harus 8 karakter.', old: oldData }
    return res.redirect('/admin/users/create')
  }

  if (password !== password_confirmation) {
    req.session.flash = { error: 'Password dan konfirmasi password tidak cocok.', old: oldData }
    return res.redirect('/admin/users/create')
  }

  if (!ROLES.includes(roleTrimmed)) {
    req.session.flash = { error: 'Role tidak valid.', old: oldData }
    return res.redirect('/admin/users/create')
  }

  try {
    // Check for duplicate ID or email
    const existing = await prisma.user.findFirst({
      where: { OR: [{ id: idTrimmed }, { email: emailTrimmed }] },
    })
    if (existing) {
      const field = existing.id === idTrimmed ? 'ID' : 'Email'
      req.session.flash = { error: `${field} sudah digunakan.`, old: oldData }
      return res.redirect('/admin/users/create')
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: { id: idTrimmed, name: nameTrimmed, email: emailTrimmed, role: roleTrimmed, password: hashedPassword },
    })

    req.session.flash = { success: `Pengguna "${name}" berhasil ditambahkan.` }
    res.redirect('/admin/users')
  } catch (err) {
    console.error('User store error:', err)
    req.session.flash = { error: 'Gagal menyimpan pengguna. Silakan coba lagi.' }
    res.redirect('/admin/users/create')
  }
}

/**
 * GET /admin/users/:id/edit
 * Show edit user form.
 */
export const edit = async (req, res) => {
  try {
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, email: true, role: true },
    })
    if (!target) {
      req.session.flash = { error: 'Pengguna tidak ditemukan.' }
      return res.redirect('/admin/users')
    }
    res.render('admin/user/edit', {
      title: 'Edit Pengguna',
      user: res.locals.user,
      currentPath: '/admin/users',
      roles: ROLES,
      roleLabels: ROLE_LABELS,
      target: {
        ...target,
        ...(req.session.flash?.old ?? {}),
      },
      error: req.session.flash?.error ?? null,
    })
    delete req.session.flash
  } catch (err) {
    console.error('User edit error:', err)
    req.session.flash = { error: 'Gagal memuat data pengguna.' }
    res.redirect('/admin/users')
  }
}

/**
 * POST /admin/users/:id
 * Validate and update an existing user.
 */
export const update = async (req, res) => {
  const { name, email, role, password, password_confirmation } = req.body
  const userId = req.params.id

  const nameTrimmed = name?.trim() || ''
  const emailTrimmed = email?.trim() || ''
  const roleTrimmed = role?.trim() || ''

  const oldData = { name: nameTrimmed, email: emailTrimmed, role: roleTrimmed }

  if (!nameTrimmed || !emailTrimmed || !roleTrimmed) {
    req.session.flash = { error: 'Nama, email, dan role wajib diisi.', old: oldData }
    return res.redirect(`/admin/users/${userId}/edit`)
  }

  if (!ROLES.includes(roleTrimmed)) {
    req.session.flash = { error: 'Role tidak valid.', old: oldData }
    return res.redirect(`/admin/users/${userId}/edit`)
  }

  // Prevent self-demotion lockout
  if (userId === req.session.user.id && roleTrimmed !== req.session.user.role) {
    req.session.flash = { error: 'Anda tidak dapat mengubah role Anda sendiri untuk mencegah lockout.', old: oldData }
    return res.redirect(`/admin/users/${userId}/edit`)
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailTrimmed)) {
    req.session.flash = { error: 'Format email tidak valid.', old: oldData }
    return res.redirect(`/admin/users/${userId}/edit`)
  }

  // If password is provided, validate length and confirmation
  if (password) {
    if (password.length < 8) {
      req.session.flash = { error: 'Password minimal harus 8 karakter.', old: oldData }
      return res.redirect(`/admin/users/${userId}/edit`)
    }
    if (password !== password_confirmation) {
      req.session.flash = { error: 'Password dan konfirmasi password tidak cocok.', old: oldData }
      return res.redirect(`/admin/users/${userId}/edit`)
    }
  }

  try {
    // Check email uniqueness (exclude current user)
    const emailTaken = await prisma.user.findFirst({
      where: { email: emailTrimmed, NOT: { id: userId } },
    })
    if (emailTaken) {
      req.session.flash = { error: 'Email sudah digunakan oleh pengguna lain.', old: oldData }
      return res.redirect(`/admin/users/${userId}/edit`)
    }

    const data = { name: nameTrimmed, email: emailTrimmed, role: roleTrimmed }
    if (password) {
      data.password = await bcrypt.hash(password, 10)
    }

    await prisma.user.update({ where: { id: userId }, data })

    req.session.flash = { success: `Pengguna "${nameTrimmed}" berhasil diperbarui.` }
    res.redirect('/admin/users')
  } catch (err) {
    console.error('User update error:', err)
    req.session.flash = { error: 'Gagal memperbarui pengguna.', old: oldData }
    res.redirect(`/admin/users/${userId}/edit`)
  }
}

/**
 * POST /admin/users/:id/delete
 * Delete a user (blocks if relations exist).
 */
export const destroy = async (req, res) => {
  const userId = req.params.id

  try {
    // Check for related records
    const [roomCount, draftCount, logCount] = await Promise.all([
      prisma.room.count({ where: { userId } }),
      prisma.procurementDraft.count({ where: { userId } }),
      prisma.maintenanceLog.count({ where: { userId } }),
    ])

    if (roomCount + draftCount + logCount > 0) {
      const parts = []
      if (roomCount > 0) parts.push(`${roomCount} ruangan`)
      if (draftCount > 0) parts.push(`${draftCount} draft pengadaan`)
      if (logCount > 0) parts.push(`${logCount} log pemeliharaan`)
      req.session.flash = {
        error: `Tidak dapat menghapus pengguna. Masih memiliki ${parts.join(', ')}.`,
      }
      return res.redirect('/admin/users')
    }

    // Prevent self-deletion
    if (userId === req.session.user.id) {
      req.session.flash = { error: 'Anda tidak dapat menghapus akun Anda sendiri.' }
      return res.redirect('/admin/users')
    }

    await prisma.user.delete({ where: { id: userId } })

    req.session.flash = { success: 'Pengguna berhasil dihapus.' }
    res.redirect('/admin/users')
  } catch (err) {
    console.error('User destroy error:', err)
    req.session.flash = { error: 'Gagal menghapus pengguna.' }
    res.redirect('/admin/users')
  }
}

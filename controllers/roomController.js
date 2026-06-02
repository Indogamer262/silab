import prisma from '../lib/prisma.js'

/**
 * GET /admin/rooms
 * List all rooms with their penanggung jawab.
 */
export const index = async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { name: 'asc' },
      include: {
        user: { select: { id: true, name: true } },
      },
    })
    res.render('admin/room/index', {
      title: 'Kelola Ruangan',
      user: res.locals.user,
      currentPath: '/admin/rooms',
      rooms,
      success: req.session.flash?.success ?? null,
      error: req.session.flash?.error ?? null,
    })
    delete req.session.flash
  } catch (err) {
    console.error('Room index error:', err)
    res.status(500).render('error', {
      title: 'Kesalahan Server',
      message: 'Gagal memuat daftar ruangan.',
      statusCode: 500,
    })
  }
}

/**
 * GET /admin/rooms/create
 * Show create room form.
 */
export const create = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
    res.render('admin/room/create', {
      title: 'Tambah Ruangan',
      user: res.locals.user,
      currentPath: '/admin/rooms',
      users,
      error: req.session.flash?.error ?? null,
      old: req.session.flash?.old ?? {},
    })
    delete req.session.flash
  } catch (err) {
    console.error('Room create error:', err)
    res.status(500).render('error', {
      title: 'Kesalahan Server',
      message: 'Gagal memuat form ruangan.',
      statusCode: 500,
    })
  }
}

/**
 * POST /admin/rooms
 * Validate and create a new room.
 */
export const store = async (req, res) => {
  const { name, capacity, location, userId } = req.body

  const nameTrimmed = name?.trim() || ''
  const locationTrimmed = location?.trim() || ''
  const userIdTrimmed = userId?.trim() || ''

  const oldData = { name: nameTrimmed, capacity, location: locationTrimmed, userId: userIdTrimmed }

  if (!nameTrimmed || !capacity || !locationTrimmed || !userIdTrimmed) {
    req.session.flash = { error: 'Semua field wajib diisi.', old: oldData }
    return res.redirect('/admin/rooms/create')
  }

  const capacityInt = parseInt(capacity, 10)
  if (isNaN(capacityInt) || capacityInt <= 0) {
    req.session.flash = { error: 'Kapasitas harus berupa angka positif (minimal 1).', old: oldData }
    return res.redirect('/admin/rooms/create')
  }

  try {
    // Verify user exists
    const userExists = await prisma.user.findUnique({ where: { id: userIdTrimmed } })
    if (!userExists) {
      req.session.flash = { error: 'Penanggung jawab tidak ditemukan.', old: oldData }
      return res.redirect('/admin/rooms/create')
    }

    await prisma.room.create({
      data: { name: nameTrimmed, capacity: capacityInt, location: locationTrimmed, userId: userIdTrimmed },
    })

    req.session.flash = { success: `Ruangan "${nameTrimmed}" berhasil ditambahkan.` }
    res.redirect('/admin/rooms')
  } catch (err) {
    console.error('Room store error:', err)
    req.session.flash = { error: 'Gagal menyimpan ruangan. Silakan coba lagi.', old: oldData }
    res.redirect('/admin/rooms/create')
  }
}

/**
 * GET /admin/rooms/:id/edit
 * Show edit room form.
 */
export const edit = async (req, res) => {
  try {
    const roomId = parseInt(req.params.id, 10)
    if (isNaN(roomId)) {
      req.session.flash = { error: 'ID ruangan tidak valid.' }
      return res.redirect('/admin/rooms')
    }

    const [target, users] = await Promise.all([
      prisma.room.findUnique({ where: { id: roomId } }),
      prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
    ])

    if (!target) {
      req.session.flash = { error: 'Ruangan tidak ditemukan.' }
      return res.redirect('/admin/rooms')
    }

    res.render('admin/room/edit', {
      title: 'Edit Ruangan',
      user: res.locals.user,
      currentPath: '/admin/rooms',
      target: {
        ...target,
        ...(req.session.flash?.old ?? {}),
      },
      users,
      error: req.session.flash?.error ?? null,
    })
    delete req.session.flash
  } catch (err) {
    console.error('Room edit error:', err)
    req.session.flash = { error: 'Gagal memuat data ruangan.' }
    res.redirect('/admin/rooms')
  }
}

/**
 * POST /admin/rooms/:id
 * Validate and update an existing room.
 */
export const update = async (req, res) => {
  const roomId = parseInt(req.params.id, 10)
  const { name, capacity, location, userId } = req.body

  if (isNaN(roomId)) {
    req.session.flash = { error: 'ID ruangan tidak valid.' }
    return res.redirect('/admin/rooms')
  }

  const nameTrimmed = name?.trim() || ''
  const locationTrimmed = location?.trim() || ''
  const userIdTrimmed = userId?.trim() || ''

  const oldData = { name: nameTrimmed, capacity, location: locationTrimmed, userId: userIdTrimmed }

  if (!nameTrimmed || !capacity || !locationTrimmed || !userIdTrimmed) {
    req.session.flash = { error: 'Semua field wajib diisi.', old: oldData }
    return res.redirect(`/admin/rooms/${roomId}/edit`)
  }

  const capacityInt = parseInt(capacity, 10)
  if (isNaN(capacityInt) || capacityInt <= 0) {
    req.session.flash = { error: 'Kapasitas harus berupa angka positif (minimal 1).', old: oldData }
    return res.redirect(`/admin/rooms/${roomId}/edit`)
  }

  try {
    // Verify user exists
    const userExists = await prisma.user.findUnique({ where: { id: userIdTrimmed } })
    if (!userExists) {
      req.session.flash = { error: 'Penanggung jawab tidak ditemukan.', old: oldData }
      return res.redirect(`/admin/rooms/${roomId}/edit`)
    }

    await prisma.room.update({
      where: { id: roomId },
      data: { name: nameTrimmed, capacity: capacityInt, location: locationTrimmed, userId: userIdTrimmed },
    })

    req.session.flash = { success: `Ruangan "${nameTrimmed}" berhasil diperbarui.` }
    res.redirect('/admin/rooms')
  } catch (err) {
    console.error('Room update error:', err)
    req.session.flash = { error: 'Gagal memperbarui ruangan.', old: oldData }
    res.redirect(`/admin/rooms/${roomId}/edit`)
  }
}

/**
 * POST /admin/rooms/:id/delete
 * Delete a room (blocks if inventory exists).
 */
export const destroy = async (req, res) => {
  const roomId = parseInt(req.params.id, 10)

  if (isNaN(roomId)) {
    req.session.flash = { error: 'ID ruangan tidak valid.' }
    return res.redirect('/admin/rooms')
  }

  try {
    // Check for related inventory
    const inventoryCount = await prisma.inventory.count({ where: { roomId } })
    if (inventoryCount > 0) {
      req.session.flash = {
        error: `Tidak dapat menghapus ruangan. Masih memiliki ${inventoryCount} inventaris terkait.`,
      }
      return res.redirect('/admin/rooms')
    }

    await prisma.room.delete({ where: { id: roomId } })

    req.session.flash = { success: 'Ruangan berhasil dihapus.' }
    res.redirect('/admin/rooms')
  } catch (err) {
    console.error('Room destroy error:', err)
    req.session.flash = { error: 'Gagal menghapus ruangan.' }
    res.redirect('/admin/rooms')
  }
}

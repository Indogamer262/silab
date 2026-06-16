import prisma from '../lib/prisma.js'

/**
 * GET /admin/rooms
 * List all rooms.
 */
export const index = async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { name: 'asc' },
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
    res.render('admin/room/create', {
      title: 'Tambah Ruangan',
      user: res.locals.user,
      currentPath: '/admin/rooms',
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
  const { name, location } = req.body

  const nameTrimmed = name?.trim() || ''
  const locationTrimmed = location?.trim() || ''

  const oldData = { name: nameTrimmed, location: locationTrimmed }

  if (!nameTrimmed || !locationTrimmed) {
    req.session.flash = { error: 'Semua field wajib diisi.', old: oldData }
    return res.redirect('/admin/rooms/create')
  }

  try {
    // Check for duplicate name
    const existing = await prisma.room.findUnique({ where: { name: nameTrimmed } })
    if (existing) {
      req.session.flash = { error: `Ruangan dengan nama "${nameTrimmed}" sudah ada.`, old: oldData }
      return res.redirect('/admin/rooms/create')
    }

    await prisma.room.create({
      data: { name: nameTrimmed, location: locationTrimmed },
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

    const target = await prisma.room.findUnique({ where: { id: roomId } })

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
  const { name, location } = req.body

  const nameTrimmed = name?.trim() || ''
  const locationTrimmed = location?.trim() || ''

  const oldData = { name: nameTrimmed, location: locationTrimmed }

  if (isNaN(roomId)) {
    req.session.flash = { error: 'ID ruangan tidak valid.' }
    return res.redirect('/admin/rooms')
  }

  if (!nameTrimmed || !locationTrimmed) {
    req.session.flash = { error: 'Semua field wajib diisi.', old: oldData }
    return res.redirect(`/admin/rooms/${roomId}/edit`)
  }

  try {
    // If name is being changed, check for duplicate
    const current = await prisma.room.findUnique({ where: { id: roomId } })
    if (!current) {
      req.session.flash = { error: 'Ruangan tidak ditemukan.' }
      return res.redirect('/admin/rooms')
    }

    if (nameTrimmed !== current.name) {
      const existing = await prisma.room.findUnique({ where: { name: nameTrimmed } })
      if (existing) {
        req.session.flash = { error: `Ruangan dengan nama "${nameTrimmed}" sudah ada.`, old: oldData }
        return res.redirect(`/admin/rooms/${roomId}/edit`)
      }
    }

    await prisma.room.update({
      where: { id: roomId },
      data: { name: nameTrimmed, location: locationTrimmed },
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
    const inventoryCount = await prisma.inventory.count({ where: { roomId: roomId } })
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

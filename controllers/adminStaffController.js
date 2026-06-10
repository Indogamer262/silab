import prisma from '../lib/prisma.js'

/**
 * Helper to format BigInt or Number to Rupiah currency format.
 */
const formatRupiah = (amount) => {
  return 'Rp ' + Number(amount).toLocaleString('id-ID')
}

/**
 * GET /admin-staff/procurements
 * List all locked/approved drafts.
 */
export const indexProcurements = async (req, res) => {
  try {
    const { search = '', status = '' } = req.query;

    const drafts = await prisma.procurementDraft.findMany({
      where: {
        status: 'LOCKED',
        ...(search ? {
          OR: [
            { id: isNaN(parseInt(search.replace('#PR-', ''))) ? undefined : parseInt(search.replace('#PR-', '')) },
            { user: { name: { contains: search, mode: 'insensitive' } } }
          ].filter(Boolean)
        } : {})
      },
      include: {
        user: { select: { name: true } },
        procurementDetails: {
          include: {
            item: {
              include: {
                consumable: true,
                inventories: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    // Process each draft to calculate item counts and status
    let processedDrafts = drafts.map(draft => {
      let totalAcceptedQty = 0
      let totalReceivedQty = 0
      let hasAcceptedItems = false

      draft.procurementDetails.forEach(detail => {
        if (detail.status === 'ACCEPTED') {
          hasAcceptedItems = true
          totalAcceptedQty += detail.quantity
          totalReceivedQty += detail.item.inventories.length
        }
      })

      let statusLabel = 'Belum Diterima'
      let statusColor = 'bg-gray-100 text-gray-800'
      let statusCode = 'BELUM'

      if (hasAcceptedItems) {
        if (totalReceivedQty === 0) {
          statusLabel = 'Menunggu Penerimaan'
          statusColor = 'bg-yellow-100 text-yellow-800'
          statusCode = 'MENUNGGU'
        } else if (totalReceivedQty < totalAcceptedQty) {
          statusLabel = 'Diterima Sebagian'
          statusColor = 'bg-blue-100 text-blue-800'
          statusCode = 'SEBAGIAN'
        } else {
          statusLabel = 'Selesai'
          statusColor = 'bg-green-100 text-green-800'
          statusCode = 'SELESAI'
        }
      } else {
        statusLabel = 'Tidak Ada Barang Disetujui'
        statusColor = 'bg-red-100 text-red-800'
        statusCode = 'NONE'
      }

      return {
        ...draft,
        totalAcceptedQty,
        totalReceivedQty,
        hasAcceptedItems,
        statusLabel,
        statusColor,
        statusCode,
      }
    })

    // Filter by status if specified
    if (status) {
      processedDrafts = processedDrafts.filter(d => d.statusCode === status);
    }

    res.render('admin-staff/procurements/index', {
      title: 'Penerimaan Pengadaan Barang',
      user: res.locals.user,
      currentPath: '/admin-staff/procurements',
      drafts: processedDrafts,
      search,
      status,
      success: req.session.flash?.success ?? null,
      error: req.session.flash?.error ?? null,
    })
    delete req.session.flash
  } catch (err) {
    console.error('Admin Staff procurement index error:', err)
    res.status(500).render('error', {
      title: 'Kesalahan Server',
      message: 'Gagal memuat daftar pengadaan barang.',
      statusCode: 500,
    })
  }
}

/**
 * GET /admin-staff/procurements/:id
 * Show accepted items in the procurement draft and support receiving them.
 */
export const showProcurement = async (req, res) => {
  try {
    const draftId = parseInt(req.params.id, 10)
    if (isNaN(draftId)) {
      req.session.flash = { error: 'ID draf tidak valid.' }
      return res.redirect('/admin-staff/procurements')
    }

    const draft = await prisma.procurementDraft.findUnique({
      where: { id: draftId },
      include: {
        user: { select: { name: true } },
        procurementDetails: {
          include: {
            item: {
              include: {
                consumable: true,
                inventories: {
                  include: {
                    room: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!draft) {
      req.session.flash = { error: 'Draf pengadaan tidak ditemukan.' }
      return res.redirect('/admin-staff/procurements')
    }

    if (draft.status !== 'LOCKED') {
      req.session.flash = { error: 'Draf pengadaan belum diajukan.' }
      return res.redirect('/admin-staff/procurements')
    }

    const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } })

    // Separate details into accepted/rejected/pending
    const acceptedDetails = draft.procurementDetails.filter(d => d.status === 'ACCEPTED')

    res.render('admin-staff/procurements/show', {
      title: `Penerimaan Barang Draf #${draft.id}`,
      user: res.locals.user,
      currentPath: '/admin-staff/procurements',
      draft,
      acceptedDetails,
      rooms,
      formatRupiah,
      success: req.session.flash?.success ?? null,
      error: req.session.flash?.error ?? null,
      old: req.session.flash?.old ?? {},
    })
    delete req.session.flash
  } catch (err) {
    console.error('Admin Staff procurement show error:', err)
    res.status(500).render('error', {
      title: 'Kesalahan Server',
      message: 'Gagal memuat detail penerimaan barang.',
      statusCode: 500,
    })
  }
}

/**
 * POST /admin-staff/procurements/:id/receive/:detailId
 * Handle goods receiving for a specific detail item.
 */
export const receiveItem = async (req, res) => {
  const draftId = parseInt(req.params.id, 10)
  const detailId = parseInt(req.params.detailId, 10)
  const { qrCode, roomId, condition, receivedDate } = req.body

  if (isNaN(draftId) || isNaN(detailId)) {
    req.session.flash = { error: 'ID tidak valid.' }
    return res.redirect('/admin-staff/procurements')
  }

  const qrCodeTrimmed = qrCode?.trim() || ''
  const roomIdParsed = parseInt(roomId, 10)
  const dateVal = receivedDate ? new Date(receivedDate) : new Date()

  const oldData = { qrCode: qrCodeTrimmed, roomId, condition, receivedDate }

  if (!qrCodeTrimmed || isNaN(roomIdParsed) || !condition) {
    req.session.flash = { error: 'Semua field (Label/QR Code, Ruangan, Kondisi) wajib diisi.', old: oldData }
    return res.redirect(`/admin-staff/procurements/${draftId}`)
  }

  try {
    // 1. Verify detail exists, belongs to the draft, is ACCEPTED, and has remaining quantity
    const detail = await prisma.procurementDetail.findUnique({
      where: { id: detailId },
      include: {
        item: {
          include: {
            consumable: true,
            inventories: true,
          },
        },
      },
    })

    if (!detail || detail.draftId !== draftId) {
      req.session.flash = { error: 'Item pengadaan tidak ditemukan.' }
      return res.redirect(`/admin-staff/procurements/${draftId}`)
    }

    if (detail.status !== 'ACCEPTED') {
      req.session.flash = { error: 'Item ini tidak disetujui untuk dibeli.' }
      return res.redirect(`/admin-staff/procurements/${draftId}`)
    }

    if (detail.item.inventories.length >= detail.quantity) {
      req.session.flash = { error: 'Semua barang untuk item ini sudah diterima.' }
      return res.redirect(`/admin-staff/procurements/${draftId}`)
    }

    // 2. Verify Room exists
    const room = await prisma.room.findUnique({ where: { id: roomIdParsed } })
    if (!room) {
      req.session.flash = { error: 'Ruangan yang dipilih tidak valid.', old: oldData }
      return res.redirect(`/admin-staff/procurements/${draftId}`)
    }

    // 3. Verify unique QR Code
    const existingInv = await prisma.inventory.findUnique({ where: { qrCode: qrCodeTrimmed } })
    if (existingInv) {
      req.session.flash = { error: `Label/QR Code "${qrCodeTrimmed}" sudah digunakan oleh barang lain.`, old: oldData }
      return res.redirect(`/admin-staff/procurements/${draftId}`)
    }

    // 4. Create inventory record
    await prisma.$transaction(async (tx) => {
      await tx.inventory.create({
        data: {
          qrCode: qrCodeTrimmed,
          receivedDate: dateVal,
          condition: condition,
          itemId: detail.itemId,
          roomId: roomIdParsed,
        },
      })

      // If it is BHP (consumable), we should also increase its stock since it has arrived
      if (detail.item.consumable) {
        await tx.consumable.update({
          where: { id: detail.item.consumable.id },
          data: {
            stock: { increment: 1 },
          },
        })
      }
    })

    req.session.flash = { success: `Barang "${detail.item.name}" dengan label "${qrCodeTrimmed}" berhasil diterima.` }
    res.redirect(`/admin-staff/procurements/${draftId}`)
  } catch (err) {
    console.error('Admin Staff receive item error:', err)
    req.session.flash = { error: 'Gagal memproses penerimaan barang.', old: oldData }
    res.redirect(`/admin-staff/procurements/${draftId}`)
  }
}

/**
 * GET /admin-staff/inventory
 * List all inventories for admin staff to update.
 */
export const indexInventory = async (req, res) => {
  try {
    const { search, roomId, condition } = req.query

    const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } })

    const where = {}
    if (search) {
      where.OR = [
        { qrCode: { contains: search } },
        { item: { name: { contains: search } } },
      ]
    }
    if (roomId) {
      const rId = parseInt(roomId, 10)
      if (!isNaN(rId)) {
        where.roomId = rId
      }
    }
    if (condition) {
      where.condition = condition
    }

    const inventories = await prisma.inventory.findMany({
      where,
      include: {
        item: true,
        room: true,
      },
      orderBy: { qrCode: 'asc' },
    })

    res.render('admin-staff/inventory/index', {
      title: 'Kelola Label & QR Inventaris',
      user: res.locals.user,
      currentPath: '/admin-staff/inventory',
      inventories,
      rooms,
      search: search || '',
      selectedRoom: roomId || '',
      selectedCondition: condition || '',
      success: req.session.flash?.success ?? null,
      error: req.session.flash?.error ?? null,
    })
    delete req.session.flash
  } catch (err) {
    console.error('Admin Staff inventory index error:', err)
    res.status(500).render('error', {
      title: 'Kesalahan Server',
      message: 'Gagal memuat daftar inventaris.',
      statusCode: 500,
    })
  }
}

/**
 * GET /admin-staff/inventory/:id/edit
 * Show edit inventory form.
 */
export const editInventory = async (req, res) => {
  try {
    const invId = parseInt(req.params.id, 10)
    if (isNaN(invId)) {
      req.session.flash = { error: 'ID inventaris tidak valid.' }
      return res.redirect('/admin-staff/inventory')
    }

    const inventory = await prisma.inventory.findUnique({
      where: { id: invId },
      include: { item: true, room: true },
    })

    if (!inventory) {
      req.session.flash = { error: 'Barang inventaris tidak ditemukan.' }
      return res.redirect('/admin-staff/inventory')
    }

    const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } })

    res.render('admin-staff/inventory/edit', {
      title: 'Edit Label & QR Inventaris',
      user: res.locals.user,
      currentPath: '/admin-staff/inventory',
      target: {
        ...inventory,
        ...(req.session.flash?.old ?? {}),
      },
      rooms,
      error: req.session.flash?.error ?? null,
    })
    delete req.session.flash
  } catch (err) {
    console.error('Admin Staff inventory edit error:', err)
    req.session.flash = { error: 'Gagal memuat data inventaris.' }
    res.redirect('/admin-staff/inventory')
  }
}

/**
 * POST /admin-staff/inventory/:id/edit
 * Update inventory details.
 */
export const updateInventory = async (req, res) => {
  const invId = parseInt(req.params.id, 10)
  const { qrCode, roomId, condition } = req.body

  if (isNaN(invId)) {
    req.session.flash = { error: 'ID inventaris tidak valid.' }
    return res.redirect('/admin-staff/inventory')
  }

  const qrCodeTrimmed = qrCode?.trim() || ''
  const roomIdParsed = parseInt(roomId, 10)

  const oldData = { qrCode: qrCodeTrimmed, roomId, condition }

  if (!qrCodeTrimmed || isNaN(roomIdParsed) || !condition) {
    req.session.flash = { error: 'Semua field wajib diisi.', old: oldData }
    return res.redirect(`/admin-staff/inventory/${invId}/edit`)
  }

  try {
    const current = await prisma.inventory.findUnique({ where: { id: invId } })
    if (!current) {
      req.session.flash = { error: 'Barang inventaris tidak ditemukan.' }
      return res.redirect('/admin-staff/inventory')
    }

    // Check QR code uniqueness if changed
    if (qrCodeTrimmed !== current.qrCode) {
      const existing = await prisma.inventory.findUnique({ where: { qrCode: qrCodeTrimmed } })
      if (existing) {
        req.session.flash = { error: `Label/QR Code "${qrCodeTrimmed}" sudah digunakan oleh barang lain.`, old: oldData }
        return res.redirect(`/admin-staff/inventory/${invId}/edit`)
      }
    }

    // Check Room exists
    const room = await prisma.room.findUnique({ where: { id: roomIdParsed } })
    if (!room) {
      req.session.flash = { error: 'Ruangan tidak valid.', old: oldData }
      return res.redirect(`/admin-staff/inventory/${invId}/edit`)
    }

    await prisma.inventory.update({
      where: { id: invId },
      data: {
        qrCode: qrCodeTrimmed,
        roomId: roomIdParsed,
        condition,
      },
    })

    req.session.flash = { success: `Barang inventaris "${qrCodeTrimmed}" berhasil diperbarui.` }
    res.redirect('/admin-staff/inventory')
  } catch (err) {
    console.error('Admin Staff inventory update error:', err)
    req.session.flash = { error: 'Gagal memperbarui barang inventaris.', old: oldData }
    res.redirect(`/admin-staff/inventory/${invId}/edit`)
  }
}

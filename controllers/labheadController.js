import prisma from '../lib/prisma.js'

/**
 * Helper to format BigInt or Number to Rupiah currency format.
 */
const formatRupiah = (amount) => {
  return 'Rp ' + Number(amount).toLocaleString('id-ID')
}

/**
 * GET /labhead
 * List all procurement drafts created by the logged-in Lab Head.
 */
export const index = async (req, res) => {
  try {
    const { year, month } = req.query

    // Fetch all drafts for this user first
    const allDrafts = await prisma.procurementDraft.findMany({
      where: { userId: req.session.user.id },
      orderBy: { date: 'desc' },
      include: {
        procurementDetails: true,
      },
    })

    // Filter in JS
    let filteredDrafts = allDrafts
    if (year) {
      const yearInt = parseInt(year, 10)
      if (!isNaN(yearInt)) {
        filteredDrafts = filteredDrafts.filter(d => d.date.getFullYear() === yearInt)
      }
    }
    if (month) {
      const monthInt = parseInt(month, 10)
      if (!isNaN(monthInt) && monthInt >= 1 && monthInt <= 12) {
        filteredDrafts = filteredDrafts.filter(d => (d.date.getMonth() + 1) === monthInt)
      }
    }

    // Extract unique years from all drafts of this user
    const years = [...new Set(allDrafts.map(d => d.date.getFullYear()))].sort((a, b) => b - a)

    res.render('labhead/index', {
      title: 'Pengadaan Barang',
      user: res.locals.user,
      currentPath: '/labhead',
      drafts: filteredDrafts,
      years,
      selectedYear: year || '',
      selectedMonth: month || '',
      formatRupiah,
      success: req.session.flash?.success ?? null,
      error: req.session.flash?.error ?? null,
    })
    delete req.session.flash
  } catch (err) {
    console.error('Procurement index error:', err)
    res.status(500).render('error', {
      title: 'Kesalahan Server',
      message: 'Gagal memuat daftar pengadaan.',
      statusCode: 500,
    })
  }
}

/**
 * POST /labhead
 * Create a new empty procurement draft.
 */
export const store = async (req, res) => {
  try {
    const newDraft = await prisma.procurementDraft.create({
      data: {
        date: new Date(),
        userId: req.session.user.id,
        status: 'DRAFT',
      },
    })

    req.session.flash = { success: 'Draf pengadaan baru berhasil dibuat.' }
    res.redirect(`/labhead/${newDraft.id}`)
  } catch (err) {
    console.error('Procurement store error:', err)
    req.session.flash = { error: 'Gagal membuat draf pengadaan baru.' }
    res.redirect('/labhead')
  }
}

/**
 * GET /labhead/:id
 * Show procurement draft details and edit form if status is DRAFT.
 */
export const show = async (req, res) => {
  try {
    const draftId = parseInt(req.params.id, 10)
    if (isNaN(draftId)) {
      req.session.flash = { error: 'ID draf tidak valid.' }
      return res.redirect('/labhead')
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
              },
            },
            replacedInventory: {
              include: {
                item: true,
                room: true,
              },
            },
          },
        },
      },
    })

    if (!draft) {
      req.session.flash = { error: 'Draf pengadaan tidak ditemukan.' }
      return res.redirect('/labhead')
    }

    // Ensure user only accesses their own drafts (security check)
    if (draft.userId !== req.session.user.id) {
      req.session.flash = { error: 'Anda tidak memiliki akses ke draf ini.' }
      return res.redirect('/labhead')
    }

    // Fetch all existing inventory items for the replacement option
    const inventories = await prisma.inventory.findMany({
      include: {
        item: true,
        room: true,
      },
      orderBy: {
        qrCode: 'asc',
      },
    })

    res.render('labhead/show', {
      title: `Detail Draf Pengadaan #${draft.id}`,
      user: res.locals.user,
      currentPath: '/labhead',
      draft,
      inventories,
      formatRupiah,
      success: req.session.flash?.success ?? null,
      error: req.session.flash?.error ?? null,
      old: req.session.flash?.old ?? {},
    })
    delete req.session.flash
  } catch (err) {
    console.error('Procurement show error:', err)
    res.status(500).render('error', {
      title: 'Kesalahan Server',
      message: 'Gagal memuat detail draf pengadaan.',
      statusCode: 500,
    })
  }
}

/**
 * POST /labhead/:id/items
 * Add an item to the procurement draft.
 */
export const addItem = async (req, res) => {
  const draftId = parseInt(req.params.id, 10)
  if (isNaN(draftId)) {
    req.session.flash = { error: 'ID draf tidak valid.' }
    return res.redirect('/labhead')
  }

  const { name, price, quantity, link, itemType, category, replacedInventoryId, unit } = req.body

  const nameTrimmed = name?.trim() || ''
  const linkTrimmed = link?.trim() || ''
  const unitTrimmed = unit?.trim() || ''
  const priceParsed = parseFloat(price)
  const quantityParsed = parseInt(quantity, 10)

  const oldData = { name: nameTrimmed, price, quantity, link: linkTrimmed, itemType, category, replacedInventoryId, unit: unitTrimmed }

  // 1. Validate general fields
  if (!nameTrimmed || isNaN(priceParsed) || priceParsed <= 0 || isNaN(quantityParsed) || quantityParsed <= 0 || !linkTrimmed || !itemType) {
    req.session.flash = { error: 'Semua field wajib diisi dengan benar.', old: oldData }
    return res.redirect(`/labhead/${draftId}`)
  }

  try {
    // 2. Verify draft exists, is not locked, and belongs to the user
    const draft = await prisma.procurementDraft.findUnique({ where: { id: draftId } })
    if (!draft || draft.userId !== req.session.user.id) {
      req.session.flash = { error: 'Draf tidak ditemukan atau Anda tidak memiliki akses.' }
      return res.redirect('/labhead')
    }

    if (draft.status !== 'DRAFT') {
      req.session.flash = { error: 'Draf telah diajukan/difinalisasi dan tidak dapat diubah lagi.' }
      return res.redirect(`/labhead/${draftId}`)
    }

    // 3. Specific validation based on type
    let finalCategory = 'NON_ELECTRONICS'
    let dbReplacedInventoryId = null

    if (itemType === 'inventaris') {
      if (!category || !['ELECTRONICS', 'NON_ELECTRONICS'].includes(category)) {
        req.session.flash = { error: 'Kategori inventaris tidak valid.', old: oldData }
        return res.redirect(`/labhead/${draftId}`)
      }
      finalCategory = category

      if (replacedInventoryId) {
        const repId = parseInt(replacedInventoryId, 10)
        if (!isNaN(repId)) {
          const invExists = await prisma.inventory.findUnique({ where: { id: repId } })
          if (!invExists) {
            req.session.flash = { error: 'Barang inventaris pengganti tidak ditemukan.', old: oldData }
            return res.redirect(`/labhead/${draftId}`)
          }
          dbReplacedInventoryId = repId
        }
      }
    } else if (itemType === 'bhp') {
      if (!unitTrimmed) {
        req.session.flash = { error: 'Satuan BHP wajib diisi.', old: oldData }
        return res.redirect(`/labhead/${draftId}`)
      }
    } else {
      req.session.flash = { error: 'Tipe item tidak valid.', old: oldData }
      return res.redirect(`/labhead/${draftId}`)
    }

    // 4. Perform database insertion in a transaction
    await prisma.$transaction(async (tx) => {
      // Create parent Item
      const newItem = await tx.item.create({
        data: {
          name: nameTrimmed,
          category: finalCategory,
          price: BigInt(priceParsed),
          link: linkTrimmed,
        },
      })

      // Create Consumable if BHP
      if (itemType === 'bhp') {
        await tx.consumable.create({
          data: {
            name: nameTrimmed,
            unit: unitTrimmed,
            stock: 0,
            itemId: newItem.id,
          },
        })
      }

      // Create ProcurementDetail
      await tx.procurementDetail.create({
        data: {
          quantity: quantityParsed,
          price: BigInt(quantityParsed * priceParsed),
          status: 'PENDING',
          draftId: draftId,
          itemId: newItem.id,
          replacedInventoryId: dbReplacedInventoryId,
        },
      })
    })

    req.session.flash = { success: `Item "${nameTrimmed}" berhasil ditambahkan ke draf.` }
    res.redirect(`/labhead/${draftId}`)
  } catch (err) {
    console.error('Procurement addItem error:', err)
    req.session.flash = { error: 'Gagal menambahkan item ke draf. Silakan coba lagi.', old: oldData }
    res.redirect(`/labhead/${draftId}`)
  }
}

/**
 * POST /labhead/:id/items/:detailId/delete
 * Delete an item from a procurement draft.
 */
export const removeItem = async (req, res) => {
  const draftId = parseInt(req.params.id, 10)
  const detailId = parseInt(req.params.detailId, 10)

  if (isNaN(draftId) || isNaN(detailId)) {
    req.session.flash = { error: 'ID tidak valid.' }
    return res.redirect('/labhead')
  }

  try {
    // Verify draft ownership and status
    const draft = await prisma.procurementDraft.findUnique({ where: { id: draftId } })
    if (!draft || draft.userId !== req.session.user.id) {
      req.session.flash = { error: 'Draf tidak ditemukan atau Anda tidak memiliki akses.' }
      return res.redirect('/labhead')
    }

    if (draft.status !== 'DRAFT') {
      req.session.flash = { error: 'Draf telah diajukan/difinalisasi dan tidak dapat diubah lagi.' }
      return res.redirect(`/labhead/${draftId}`)
    }

    // Verify detail belongs to this draft
    const detail = await prisma.procurementDetail.findUnique({
      where: { id: detailId },
      include: {
        item: {
          include: {
            consumable: true,
          },
        },
      },
    })

    if (!detail || detail.draftId !== draftId) {
      req.session.flash = { error: 'Item tidak ditemukan di draf ini.' }
      return res.redirect(`/labhead/${draftId}`)
    }

    // Perform deletion
    await prisma.$transaction(async (tx) => {
      // 1. Delete detail
      await tx.procurementDetail.delete({ where: { id: detailId } })

      // 2. Delete consumable if exists
      if (detail.item.consumable) {
        await tx.consumable.delete({ where: { id: detail.item.consumable.id } })
      }

      // 3. Delete parent item
      await tx.item.delete({ where: { id: detail.itemId } })
    })

    req.session.flash = { success: `Item "${detail.item.name}" berhasil dihapus dari draf.` }
    res.redirect(`/labhead/${draftId}`)
  } catch (err) {
    console.error('Procurement removeItem error:', err)
    req.session.flash = { error: 'Gagal menghapus item dari draf.' }
    res.redirect(`/labhead/${draftId}`)
  }
}

/**
 * POST /labhead/:id/items/:detailId/edit
 * Update an item details in the procurement draft.
 */
export const updateItem = async (req, res) => {
  const draftId = parseInt(req.params.id, 10)
  const detailId = parseInt(req.params.detailId, 10)

  if (isNaN(draftId) || isNaN(detailId)) {
    req.session.flash = { error: 'ID tidak valid.' }
    return res.redirect('/labhead')
  }

  const { name, price, quantity, link, itemType, category, replacedInventoryId, unit } = req.body

  const nameTrimmed = name?.trim() || ''
  const linkTrimmed = link?.trim() || ''
  const unitTrimmed = unit?.trim() || ''
  const priceParsed = parseFloat(price)
  const quantityParsed = parseInt(quantity, 10)

  if (!nameTrimmed || isNaN(priceParsed) || priceParsed <= 0 || isNaN(quantityParsed) || quantityParsed <= 0 || !linkTrimmed || !itemType) {
    req.session.flash = { error: 'Semua field wajib diisi dengan benar.' }
    return res.redirect(`/labhead/${draftId}`)
  }

  try {
    // Verify draft ownership and status
    const draft = await prisma.procurementDraft.findUnique({ where: { id: draftId } })
    if (!draft || draft.userId !== req.session.user.id) {
      req.session.flash = { error: 'Draf tidak ditemukan atau Anda tidak memiliki akses.' }
      return res.redirect('/labhead')
    }

    if (draft.status !== 'DRAFT') {
      req.session.flash = { error: 'Draf telah diajukan/difinalisasi dan tidak dapat diubah lagi.' }
      return res.redirect(`/labhead/${draftId}`)
    }

    // Verify detail belongs to this draft
    const detail = await prisma.procurementDetail.findUnique({
      where: { id: detailId },
      include: {
        item: {
          include: {
            consumable: true,
          },
        },
      },
    })

    if (!detail || detail.draftId !== draftId) {
      req.session.flash = { error: 'Item tidak ditemukan di draf ini.' }
      return res.redirect(`/labhead/${draftId}`)
    }

    let finalCategory = 'NON_ELECTRONICS'
    let dbReplacedInventoryId = null

    if (itemType === 'inventaris') {
      if (!category || !['ELECTRONICS', 'NON_ELECTRONICS'].includes(category)) {
        req.session.flash = { error: 'Kategori inventaris tidak valid.' }
        return res.redirect(`/labhead/${draftId}`)
      }
      finalCategory = category

      if (replacedInventoryId) {
        const repId = parseInt(replacedInventoryId, 10)
        if (!isNaN(repId)) {
          const invExists = await prisma.inventory.findUnique({ where: { id: repId } })
          if (!invExists) {
            req.session.flash = { error: 'Barang inventaris pengganti tidak ditemukan.' }
            return res.redirect(`/labhead/${draftId}`)
          }
          dbReplacedInventoryId = repId
        }
      }
    } else if (itemType === 'bhp') {
      if (!unitTrimmed) {
        req.session.flash = { error: 'Satuan BHP wajib diisi.' }
        return res.redirect(`/labhead/${draftId}`)
      }
    } else {
      req.session.flash = { error: 'Tipe item tidak valid.' }
      return res.redirect(`/labhead/${draftId}`)
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update item fields
      await tx.item.update({
        where: { id: detail.itemId },
        data: {
          name: nameTrimmed,
          category: finalCategory,
          price: BigInt(priceParsed),
          link: linkTrimmed,
        },
      })

      // 2. Manage consumable transition
      if (itemType === 'bhp') {
        if (detail.item.consumable) {
          await tx.consumable.update({
            where: { id: detail.item.consumable.id },
            data: {
              name: nameTrimmed,
              unit: unitTrimmed,
            },
          })
        } else {
          await tx.consumable.create({
            data: {
              name: nameTrimmed,
              unit: unitTrimmed,
              stock: 0,
              itemId: detail.itemId,
            },
          })
        }
      } else {
        // If it was BHP previously but now Inventaris, delete consumable record
        if (detail.item.consumable) {
          await tx.consumable.delete({ where: { id: detail.item.consumable.id } })
        }
      }

      // 3. Update procurement detail
      await tx.procurementDetail.update({
        where: { id: detailId },
        data: {
          quantity: quantityParsed,
          price: BigInt(quantityParsed * priceParsed),
          replacedInventoryId: dbReplacedInventoryId,
        },
      })
    })

    req.session.flash = { success: `Item "${nameTrimmed}" berhasil diperbarui.` }
    res.redirect(`/labhead/${draftId}`)
  } catch (err) {
    console.error('Procurement updateItem error:', err)
    req.session.flash = { error: 'Gagal memperbarui item.' }
    res.redirect(`/labhead/${draftId}`)
  }
}


/**
 * POST /labhead/:id/lock
 * Finalize/lock a procurement draft.
 */
export const lock = async (req, res) => {
  const draftId = parseInt(req.params.id, 10)
  if (isNaN(draftId)) {
    req.session.flash = { error: 'ID draf tidak valid.' }
    return res.redirect('/labhead')
  }

  try {
    const draft = await prisma.procurementDraft.findUnique({
      where: { id: draftId },
      include: { procurementDetails: true },
    })

    if (!draft || draft.userId !== req.session.user.id) {
      req.session.flash = { error: 'Draf tidak ditemukan atau Anda tidak memiliki akses.' }
      return res.redirect('/labhead')
    }

    if (draft.status !== 'DRAFT') {
      req.session.flash = { error: 'Draf sudah diajukan atau difinalisasi.' }
      return res.redirect(`/labhead/${draftId}`)
    }

    if (draft.procurementDetails.length === 0) {
      req.session.flash = { error: 'Draf kosong tidak dapat dikunci. Silakan tambahkan minimal satu item.' }
      return res.redirect(`/labhead/${draftId}`)
    }

    await prisma.procurementDraft.update({
      where: { id: draftId },
      data: { status: 'LOCKED' },
    })

    req.session.flash = { success: 'Draf pengadaan berhasil dikunci (locked) dan diajukan.' }
    res.redirect(`/labhead/${draftId}`)
  } catch (err) {
    console.error('Procurement lock error:', err)
    req.session.flash = { error: 'Gagal mengunci draf.' }
    res.redirect(`/labhead/${draftId}`)
  }
}

/**
 * POST /labhead/:id/delete
 * Delete an entire procurement draft along with its items.
 */
export const destroy = async (req, res) => {
  const draftId = parseInt(req.params.id, 10)
  if (isNaN(draftId)) {
    req.session.flash = { error: 'ID draf tidak valid.' }
    return res.redirect('/labhead')
  }

  try {
    const draft = await prisma.procurementDraft.findUnique({
      where: { id: draftId },
      include: {
        procurementDetails: {
          include: {
            item: {
              include: {
                consumable: true,
              },
            },
          },
        },
      },
    })

    if (!draft || draft.userId !== req.session.user.id) {
      req.session.flash = { error: 'Draf tidak ditemukan atau Anda tidak memiliki akses.' }
      return res.redirect('/labhead')
    }

    if (draft.status !== 'DRAFT') {
      req.session.flash = { error: 'Draf telah diajukan/difinalisasi dan tidak dapat dihapus.' }
      return res.redirect(`/labhead/${draftId}`)
    }

    // Delete in sequence
    await prisma.$transaction(async (tx) => {
      // 1. Delete details
      await tx.procurementDetail.deleteMany({ where: { draftId } })

      // 2. Delete consumables & items
      for (const detail of draft.procurementDetails) {
        if (detail.item.consumable) {
          await tx.consumable.delete({ where: { id: detail.item.consumable.id } })
        }
        await tx.item.delete({ where: { id: detail.itemId } })
      }

      // 3. Delete draft
      await tx.procurementDraft.delete({ where: { id: draftId } })
    })

    req.session.flash = { success: 'Draf pengadaan berhasil dihapus.' }
    res.redirect('/labhead')
  } catch (err) {
    console.error('Procurement destroy error:', err)
    req.session.flash = { error: 'Gagal menghapus draf.' }
    res.redirect(`/labhead/${draftId}`)
  }
}

/**
 * GET /labhead/inventory
 * Display list of Inventories & BHP (Consumables) for LAB_HEAD with filters.
 */
export const inventoryIndex = async (req, res) => {
  try {
    const { search, type, condition, category, room } = req.query

    // 1. Fetch filter options (rooms)
    const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } })

    let inventories = []
    let consumables = []

    // Build filters for Inventory
    const invWhere = {}
    if (search) {
      invWhere.item = {
        name: { contains: search }
      }
    }
    if (condition) {
      invWhere.condition = condition
    }
    if (category) {
      if (!invWhere.item) invWhere.item = {}
      invWhere.item.category = category
    }
    if (room) {
      invWhere.roomId = room
    }

    // Build filters for Consumable
    const consWhere = {}
    if (search) {
      consWhere.name = { contains: search }
    }
    if (category) {
      consWhere.item = {
        category: category
      }
    }

    // Load data based on requested type filter
    if (!type || type === 'all' || type === 'inventaris') {
      inventories = await prisma.inventory.findMany({
        where: invWhere,
        include: {
          item: true,
          room: true,
        },
        orderBy: {
          qrCode: 'asc',
        },
      })
    }

    if (!type || type === 'all' || type === 'bhp') {
      consumables = await prisma.consumable.findMany({
        where: consWhere,
        include: {
          item: true,
        },
        orderBy: {
          name: 'asc',
        },
      })
    }

    res.render('labhead/inventory', {
      title: 'Daftar Inventaris & BHP',
      user: res.locals.user,
      currentPath: '/labhead/inventory',
      inventories,
      consumables,
      rooms,
      search: search || '',
      selectedType: type || 'all',
      selectedCondition: condition || '',
      selectedCategory: category || '',
      selectedRoom: room || '',
    })
  } catch (err) {
    console.error('Procurement inventoryIndex error:', err)
    res.status(500).render('error', {
      title: 'Kesalahan Server',
      message: 'Gagal memuat daftar inventaris dan BHP.',
      statusCode: 500,
    })
  }
}


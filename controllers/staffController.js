import prisma from '../lib/prisma.js'

/**
 * GET /staff/bhp
 * List all consumables (BHP).
 */
export const bhpIndex = async (req, res) => {
  try {
    const consumables = await prisma.consumable.findMany({
      include: { item: true },
      orderBy: { name: 'asc' },
    })

    res.render('staff/bhp', {
      title: 'Kelola BHP',
      user: res.locals.user,
      currentPath: '/staff/bhp',
      consumables,
      success: req.session.flash?.success ?? null,
      error: req.session.flash?.error ?? null,
    })
    delete req.session.flash
  } catch (err) {
    console.error('Staff BHP index error:', err)
    res.status(500).render('error', { title: 'Kesalahan Server', message: 'Gagal memuat daftar BHP.', statusCode: 500 })
  }
}

/**
 * POST /staff/bhp/add
 * Add a new BHP (creates Item + Consumable).
 */
export const addBhp = async (req, res) => {
  const { name, unit, stock, category, link } = req.body
  const nameTrimmed = name?.trim() || ''
  const unitTrimmed = unit?.trim() || ''
  const stockVal = parseInt(stock, 10)
  const finalCategory = ['ELECTRONICS', 'NON_ELECTRONICS'].includes(category) ? category : 'NON_ELECTRONICS'
  const linkTrimmed = link?.trim() || '-'

  if (!nameTrimmed || !unitTrimmed || isNaN(stockVal) || stockVal < 0) {
    req.session.flash = { error: 'Nama, satuan, dan stok awal wajib diisi dengan benar.' }
    return res.redirect('/staff/bhp')
  }

  try {
    await prisma.$transaction(async (tx) => {
      const newItem = await tx.item.create({
        data: { name: nameTrimmed, category: finalCategory, price: 0n, link: linkTrimmed },
      })
      await tx.consumable.create({
        data: { name: nameTrimmed, unit: unitTrimmed, stock: stockVal, itemId: newItem.id },
      })
    })
    req.session.flash = { success: `BHP "${nameTrimmed}" berhasil ditambahkan.` }
    res.redirect('/staff/bhp')
  } catch (err) {
    console.error('Staff addBhp error:', err)
    req.session.flash = { error: 'Gagal menambahkan BHP.' }
    res.redirect('/staff/bhp')
  }
}

/**
 * POST /staff/bhp/:id/edit
 * Edit BHP name, unit, category.
 */
export const updateBhp = async (req, res) => {
  const consumableId = parseInt(req.params.id, 10)
  const { name, unit, category } = req.body
  const nameTrimmed = name?.trim() || ''
  const unitTrimmed = unit?.trim() || ''
  const finalCategory = ['ELECTRONICS', 'NON_ELECTRONICS'].includes(category) ? category : 'NON_ELECTRONICS'

  if (isNaN(consumableId) || !nameTrimmed || !unitTrimmed) {
    req.session.flash = { error: 'Nama dan satuan wajib diisi.' }
    return res.redirect('/staff/bhp')
  }

  try {
    const consumable = await prisma.consumable.findUnique({ where: { id: consumableId }, include: { item: true } })
    if (!consumable) {
      req.session.flash = { error: 'BHP tidak ditemukan.' }
      return res.redirect('/staff/bhp')
    }
    await prisma.$transaction(async (tx) => {
      await tx.item.update({ where: { id: consumable.itemId }, data: { name: nameTrimmed, category: finalCategory } })
      await tx.consumable.update({ where: { id: consumableId }, data: { name: nameTrimmed, unit: unitTrimmed } })
    })
    req.session.flash = { success: `BHP "${nameTrimmed}" berhasil diperbarui.` }
    res.redirect('/staff/bhp')
  } catch (err) {
    console.error('Staff updateBhp error:', err)
    req.session.flash = { error: 'Gagal memperbarui BHP.' }
    res.redirect('/staff/bhp')
  }
}

/**
 * POST /staff/bhp/:id/delete
 * Delete a BHP (removes Consumable + Item if no other references).
 */
export const destroyBhp = async (req, res) => {
  const consumableId = parseInt(req.params.id, 10)
  if (isNaN(consumableId)) {
    req.session.flash = { error: 'ID tidak valid.' }
    return res.redirect('/staff/bhp')
  }

  try {
    const consumable = await prisma.consumable.findUnique({
      where: { id: consumableId },
      include: { maintenanceLogs: true },
    })
    if (!consumable) {
      req.session.flash = { error: 'BHP tidak ditemukan.' }
      return res.redirect('/staff/bhp')
    }
    if (consumable.maintenanceLogs.length > 0) {
      req.session.flash = { error: `BHP ini sudah digunakan dalam ${consumable.maintenanceLogs.length} log maintenance dan tidak dapat dihapus.` }
      return res.redirect('/staff/bhp')
    }
    await prisma.$transaction(async (tx) => {
      await tx.consumable.delete({ where: { id: consumableId } })
      // Check if item has other usages before deleting
      const item = await tx.item.findUnique({
        where: { id: consumable.itemId },
        include: { inventories: true, procurementDetails: true },
      })
      if (item && item.inventories.length === 0 && item.procurementDetails.length === 0) {
        await tx.item.delete({ where: { id: consumable.itemId } })
      }
    })
    req.session.flash = { success: 'BHP berhasil dihapus.' }
    res.redirect('/staff/bhp')
  } catch (err) {
    console.error('Staff destroyBhp error:', err)
    req.session.flash = { error: 'Gagal menghapus BHP.' }
    res.redirect('/staff/bhp')
  }
}

/**
 * POST /staff/bhp/update-stock
 * Adjust consumable stock (+/-).
 */
export const updateBhpStock = async (req, res) => {
  const { id, quantity, action } = req.body
  const consumableId = parseInt(id, 10)
  const qtyVal = parseInt(quantity, 10)

  if (isNaN(consumableId) || isNaN(qtyVal) || qtyVal <= 0 || !['add', 'subtract'].includes(action)) {
    req.session.flash = { error: 'Input data tidak valid.' }
    return res.redirect('/staff/bhp')
  }

  try {
    const consumable = await prisma.consumable.findUnique({ where: { id: consumableId } })
    if (!consumable) {
      req.session.flash = { error: 'Barang habis pakai tidak ditemukan.' }
      return res.redirect('/staff/bhp')
    }

    let newStock = consumable.stock
    if (action === 'add') {
      newStock += qtyVal
    } else {
      if (consumable.stock < qtyVal) {
        req.session.flash = { error: 'Stok tidak mencukupi untuk melakukan pengurangan.' }
        return res.redirect('/staff/bhp')
      }
      newStock -= qtyVal
    }

    await prisma.consumable.update({ where: { id: consumableId }, data: { stock: newStock } })
    req.session.flash = { success: `Stok "${consumable.name}" berhasil diperbarui menjadi ${newStock} ${consumable.unit}.` }
    res.redirect('/staff/bhp')
  } catch (err) {
    console.error('Staff update BHP stock error:', err)
    req.session.flash = { error: 'Gagal memperbarui stok BHP.' }
    res.redirect('/staff/bhp')
  }
}

/**
 * GET /staff/maintenance
 * List inventory items and maintenance logs.
 */
export const maintenanceIndex = async (req, res) => {
  try {
    const { search, condition } = req.query

    const where = {}
    if (search) {
      where.OR = [
        { qrCode: { contains: search } },
        { item: { name: { contains: search } } }
      ]
    }
    if (condition && condition !== 'all') {
      where.condition = condition
    }

    const inventories = await prisma.inventory.findMany({
      where: { item: { consumable: null } },
      include: { item: true, room: true },
      orderBy: { qrCode: 'asc' },
    })

    const consumables = await prisma.consumable.findMany({
      orderBy: { name: 'asc' },
    })

    const logs = await prisma.maintenanceLog.findMany({
      include: {
        inventory: { include: { item: true } },
        consumable: true,
        user: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })

    res.render('staff/maintenance', {
      title: 'Log Maintenance & Aset',
      user: res.locals.user,
      currentPath: '/staff/maintenance',
      inventories,
      consumables,
      logs,
      search: search || '',
      selectedCondition: condition || 'all',
      success: req.session.flash?.success ?? null,
      error: req.session.flash?.error ?? null,
    })
    delete req.session.flash
  } catch (err) {
    console.error('Staff maintenance index error:', err)
    res.status(500).render('error', { title: 'Kesalahan Server', message: 'Gagal memuat log maintenance.', statusCode: 500 })
  }
}

/**
 * POST /staff/maintenance/log
 * Create new maintenance log, update asset condition, deduct BHP stock if used.
 */
export const storeMaintenanceLog = async (req, res) => {
  const { inventoryId, description, condition, consumableId, consumableQty } = req.body
  const invId = parseInt(inventoryId, 10)

  if (isNaN(invId) || !description?.trim() || !condition) {
    req.session.flash = { error: 'Mohon isi semua data wajib dengan benar.' }
    return res.redirect('/staff/maintenance')
  }

  let consId = null
  let consQty = null
  if (consumableId) {
    consId = parseInt(consumableId, 10)
    consQty = parseInt(consumableQty, 10)
    if (isNaN(consId) || isNaN(consQty) || consQty <= 0) {
      req.session.flash = { error: 'Pilihan BHP atau jumlah pemakaian tidak valid.' }
      return res.redirect('/staff/maintenance')
    }
  }

  try {
    const inventory = await prisma.inventory.findUnique({ where: { id: invId }, include: { item: true } })
    if (!inventory) {
      req.session.flash = { error: 'Barang inventaris tidak ditemukan.' }
      return res.redirect('/staff/maintenance')
    }

    await prisma.$transaction(async (tx) => {
      // 1. Deduct BHP stock if used
      if (consId && consQty) {
        const consumable = await tx.consumable.findUnique({ where: { id: consId } })
        if (!consumable) throw new Error('BHP yang dipilih tidak ditemukan.')
        if (consumable.stock < consQty) {
          throw new Error(`Stok BHP "${consumable.name}" tidak mencukupi (Tersedia: ${consumable.stock} ${consumable.unit}).`)
        }
        await tx.consumable.update({ where: { id: consId }, data: { stock: consumable.stock - consQty } })
      }

      // 2. Update inventory condition
      await tx.inventory.update({ where: { id: invId }, data: { condition } })

      // 3. Create maintenance log
      await tx.maintenanceLog.create({
        data: {
          date: new Date(),
          description: description.trim(),
          inventoryId: invId,
          consumableId: consId,
          consumableUsedQty: consQty,
          userId: req.session.user.id,
        },
      })
    })

    req.session.flash = { success: `Log maintenance untuk "${inventory.item.name}" berhasil dicatat.` }
    res.redirect('/staff/maintenance')
  } catch (err) {
    console.error('Store maintenance log error:', err)
    req.session.flash = { error: err.message || 'Gagal menyimpan log maintenance.' }
    res.redirect('/staff/maintenance')
  }
}


import prisma from '../lib/prisma.js'

/**
 * Helper to format BigInt or Number to Rupiah currency format.
 */
const formatRupiah = (amount) => {
  return 'Rp ' + Number(amount).toLocaleString('id-ID')
}

/**
 * GET /prodi-head/procurements
 * List all submitted drafts (LOCKED and FINALIZED)
 */
export const indexProcurements = async (req, res) => {
  try {
    const { search, status } = req.query

    const where = {
      status: { in: ['LOCKED', 'FINALIZED'] }
    }

    if (search) {
      where.OR = [
        { id: isNaN(parseInt(search.replace('#PR-', ''))) ? undefined : parseInt(search.replace('#PR-', '')) },
        { user: { name: { contains: search } } }
      ].filter(Boolean)
    }

    if (status) {
      where.status = status
    }

    const drafts = await prisma.procurementDraft.findMany({
      where,
      include: {
        user: { select: { name: true } },
        procurementDetails: true,
      },
      orderBy: { date: 'desc' },
    })

    res.render('prodi-head/procurements/index', {
      title: 'Review Pengadaan Barang',
      user: res.locals.user,
      currentPath: '/prodi-head/procurements',
      drafts,
      search: search || '',
      selectedStatus: status || '',
      formatRupiah,
      success: req.session.flash?.success ?? null,
      error: req.session.flash?.error ?? null,
    })
    delete req.session.flash
  } catch (err) {
    console.error('Prodi Head procurement index error:', err)
    res.status(500).render('error', {
      title: 'Kesalahan Server',
      message: 'Gagal memuat daftar draf pengadaan.',
      statusCode: 500,
    })
  }
}

/**
 * GET /prodi-head/procurements/:id
 * Show procurement draft details for review.
 */
export const showProcurement = async (req, res) => {
  try {
    const draftId = parseInt(req.params.id, 10)
    if (isNaN(draftId)) {
      req.session.flash = { error: 'ID draf tidak valid.' }
      return res.redirect('/prodi-head/procurements')
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
      return res.redirect('/prodi-head/procurements')
    }

    if (draft.status !== 'LOCKED' && draft.status !== 'FINALIZED') {
      req.session.flash = { error: 'Draf belum diajukan oleh Kepala Laboratorium.' }
      return res.redirect('/prodi-head/procurements')
    }

    // Calculate totals based on status
    let totalCost = 0n
    let totalAcceptedCost = 0n
    
    draft.procurementDetails.forEach(detail => {
      totalCost += detail.price
      if (detail.status === 'ACCEPTED') {
        totalAcceptedCost += detail.price
      }
    })

    res.render('prodi-head/procurements/show', {
      title: `Detail Draf Pengadaan #${draft.id}`,
      user: res.locals.user,
      currentPath: '/prodi-head/procurements',
      draft,
      totalCost,
      totalAcceptedCost,
      formatRupiah,
      success: req.session.flash?.success ?? null,
      error: req.session.flash?.error ?? null,
    })
    delete req.session.flash
  } catch (err) {
    console.error('Prodi Head procurement show error:', err)
    res.status(500).render('error', {
      title: 'Kesalahan Server',
      message: 'Gagal memuat detail draf pengadaan.',
      statusCode: 500,
    })
  }
}

/**
 * POST /prodi-head/procurements/:id/items/:detailId/review
 * Update the review status of a specific item (ACCEPTED/REJECTED).
 */
export const reviewItem = async (req, res) => {
  const draftId = parseInt(req.params.id, 10)
  const detailId = parseInt(req.params.detailId, 10)
  const { reviewStatus } = req.body

  if (isNaN(draftId) || isNaN(detailId)) {
    req.session.flash = { error: 'ID tidak valid.' }
    return res.redirect('/prodi-head/procurements')
  }

  if (!['ACCEPTED', 'REJECTED'].includes(reviewStatus)) {
    req.session.flash = { error: 'Status review tidak valid.' }
    return res.redirect(`/prodi-head/procurements/${draftId}`)
  }

  try {
    const draft = await prisma.procurementDraft.findUnique({
      where: { id: draftId },
    })

    if (!draft) {
      req.session.flash = { error: 'Draf tidak ditemukan.' }
      return res.redirect('/prodi-head/procurements')
    }

    if (draft.status !== 'LOCKED') {
      req.session.flash = { error: 'Draf tidak dalam status yang dapat direview atau telah difinalisasi.' }
      return res.redirect(`/prodi-head/procurements/${draftId}`)
    }

    const detail = await prisma.procurementDetail.findUnique({
      where: { id: detailId },
      include: { item: true }
    })

    if (!detail || detail.draftId !== draftId) {
      req.session.flash = { error: 'Item tidak ditemukan dalam draf ini.' }
      return res.redirect(`/prodi-head/procurements/${draftId}`)
    }

    await prisma.procurementDetail.update({
      where: { id: detailId },
      data: { status: reviewStatus },
    })

    req.session.flash = { success: `Item "${detail.item.name}" berhasil ditandai sebagai ${reviewStatus === 'ACCEPTED' ? 'Diterima' : 'Ditolak'}.` }
    res.redirect(`/prodi-head/procurements/${draftId}`)
  } catch (err) {
    console.error('Prodi Head review item error:', err)
    req.session.flash = { error: 'Gagal mengubah status item.' }
    res.redirect(`/prodi-head/procurements/${draftId}`)
  }
}

/**
 * POST /prodi-head/procurements/:id/finalize
 * Finalize the draft, changing its status to FINALIZED.
 */
export const finalizeDraft = async (req, res) => {
  const draftId = parseInt(req.params.id, 10)
  
  if (isNaN(draftId)) {
    req.session.flash = { error: 'ID draf tidak valid.' }
    return res.redirect('/prodi-head/procurements')
  }

  try {
    const draft = await prisma.procurementDraft.findUnique({
      where: { id: draftId },
      include: { procurementDetails: true },
    })

    if (!draft) {
      req.session.flash = { error: 'Draf tidak ditemukan.' }
      return res.redirect('/prodi-head/procurements')
    }

    if (draft.status === 'FINALIZED') {
      req.session.flash = { error: 'Draf ini sudah difinalisasi.' }
      return res.redirect(`/prodi-head/procurements/${draftId}`)
    }

    if (draft.status !== 'LOCKED') {
      req.session.flash = { error: 'Draf belum diajukan oleh Kepala Laboratorium.' }
      return res.redirect('/prodi-head/procurements')
    }

    // Check if there are any PENDING items
    const hasPending = draft.procurementDetails.some(d => d.status === 'PENDING')
    if (hasPending) {
      req.session.flash = { error: 'Ada item yang belum direview (masih PENDING). Harap terima atau tolak semua item sebelum finalisasi.' }
      return res.redirect(`/prodi-head/procurements/${draftId}`)
    }

    // Update draft status to FINALIZED
    await prisma.procurementDraft.update({
      where: { id: draftId },
      data: { status: 'FINALIZED' },
    })

    req.session.flash = { success: 'Draf pengadaan berhasil difinalisasi. Draf ini sekarang akan diproses oleh Staf Administrasi.' }
    res.redirect(`/prodi-head/procurements/${draftId}`)
  } catch (err) {
    console.error('Prodi Head finalize draft error:', err)
    req.session.flash = { error: 'Gagal memfinalisasi draf.' }
    res.redirect(`/prodi-head/procurements/${draftId}`)
  }
}

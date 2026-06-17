import express from 'express'
import { showLogin, processLogin, logout, changePassword } from '../controllers/authController.js'
import * as userController from '../controllers/userController.js'
import * as roomController from '../controllers/roomController.js'
import * as labheadController from '../controllers/labheadController.js'
import * as staffController from '../controllers/staffController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import * as adminStaffController from "../controllers/adminStaffController.js";
import * as prodiHeadController from "../controllers/prodiHeadController.js";

const router = express.Router()

router.use(express.urlencoded({ extended: false }))

// ─── Halaman Utama ────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/profile')
    }
    res.render('index', { title: 'Selamat Datang' })
})

// ─── Autentikasi ─────────────────────────────────────────────────────────────
router.get('/login', showLogin)
router.post('/login', processLogin)
router.post('/logout', requireAuth, logout)

// ─── Route Terproteksi ────────────────────────────────────────────────────────
router.get('/profile', requireAuth, (req, res) => {
    res.render('profile', {
        title: 'Profil',
        user: res.locals.user,
        currentPath: '/profile',
        success: req.session.flash?.success ?? null,
        error: req.session.flash?.error ?? null,
    })
    delete req.session.flash
})
router.post('/change-password', requireAuth, changePassword)


// ─── Admin: Kelola Pengguna ───────────────────────────────────────────────────
router.get('/admin/users', requireAuth, requireRole('ADMIN'), userController.index)
router.get('/admin/users/create', requireAuth, requireRole('ADMIN'), userController.create)
router.post('/admin/users', requireAuth, requireRole('ADMIN'), userController.store)
router.get('/admin/users/:id/edit', requireAuth, requireRole('ADMIN'), userController.edit)
router.post('/admin/users/:id', requireAuth, requireRole('ADMIN'), userController.update)
router.post('/admin/users/:id/delete', requireAuth, requireRole('ADMIN'), userController.destroy)

// ─── Admin: Kelola Ruangan ────────────────────────────────────────────────────
router.get('/admin/rooms', requireAuth, requireRole('ADMIN'), roomController.index)
router.get('/admin/rooms/create', requireAuth, requireRole('ADMIN'), roomController.create)
router.post('/admin/rooms', requireAuth, requireRole('ADMIN'), roomController.store)
router.get('/admin/rooms/:id/edit', requireAuth, requireRole('ADMIN'), roomController.edit)
router.post('/admin/rooms/:id', requireAuth, requireRole('ADMIN'), roomController.update)
router.post('/admin/rooms/:id/delete', requireAuth, requireRole('ADMIN'), roomController.destroy)

// ─── Kepala Lab: Pengadaan Barang ─────────────────────────────────────────────
router.get('/labhead', requireAuth, requireRole('LAB_HEAD'), labheadController.index)
router.post('/labhead', requireAuth, requireRole('LAB_HEAD'), labheadController.store)
router.get('/labhead/inventory', requireAuth, requireRole('LAB_HEAD'), labheadController.inventoryIndex)
router.get('/labhead/:id', requireAuth, requireRole('LAB_HEAD'), labheadController.show)
router.post('/labhead/:id/lock', requireAuth, requireRole('LAB_HEAD'), labheadController.lock)
router.post('/labhead/:id/items', requireAuth, requireRole('LAB_HEAD'), labheadController.addItem)
router.post('/labhead/:id/items/:detailId/delete', requireAuth, requireRole('LAB_HEAD'), labheadController.removeItem)
router.post('/labhead/:id/items/:detailId/edit', requireAuth, requireRole('LAB_HEAD'), labheadController.updateItem)
router.post('/labhead/:id/delete', requireAuth, requireRole('LAB_HEAD'), labheadController.destroy)

// ─── Staf Laboratorium: Pengelolaan & Maintenance ─────────────────────────────
router.get('/staff/bhp', requireAuth, requireRole('LAB_STAFF'), staffController.bhpIndex)
router.post('/staff/bhp/update-stock', requireAuth, requireRole('LAB_STAFF'), staffController.updateBhpStock)
router.get('/staff/maintenance', requireAuth, requireRole('LAB_STAFF'), staffController.maintenanceIndex)
router.post('/staff/maintenance/log', requireAuth, requireRole('LAB_STAFF'), staffController.storeMaintenanceLog)

// ─── Staf Administrasi: Penerimaan & Inventaris ─────────────────────────────
router.get('/admin-staff/procurements', requireAuth, requireRole('ADMIN_STAFF'), adminStaffController.indexProcurements)
router.get('/admin-staff/procurements/:id', requireAuth, requireRole('ADMIN_STAFF'), adminStaffController.showProcurement)
router.post('/admin-staff/procurements/:id/receive/:detailId', requireAuth, requireRole('ADMIN_STAFF'), adminStaffController.receiveItem)
router.get('/admin-staff/inventory', requireAuth, requireRole('ADMIN_STAFF'), adminStaffController.indexInventory)
router.get('/admin-staff/inventory/:id/edit', requireAuth, requireRole('ADMIN_STAFF'), adminStaffController.editInventory)
router.post('/admin-staff/inventory/:id/edit', requireAuth, requireRole('ADMIN_STAFF'), adminStaffController.updateInventory)

// ─── Ketua Program Studi: Review Pengadaan ────────────────────────────────────
router.get('/prodi-head/procurements', requireAuth, requireRole('PRODI_HEAD'), prodiHeadController.indexProcurements)
router.get('/prodi-head/procurements/:id', requireAuth, requireRole('PRODI_HEAD'), prodiHeadController.showProcurement)
router.post('/prodi-head/procurements/:id/items/:detailId/review', requireAuth, requireRole('PRODI_HEAD'), prodiHeadController.reviewItem)
router.post('/prodi-head/procurements/:id/finalize', requireAuth, requireRole('PRODI_HEAD'), prodiHeadController.finalizeDraft)

export default router

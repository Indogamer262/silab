import express from 'express'
import { showLogin, processLogin, logout, changePassword } from '../controllers/authController.js'
import * as userController from '../controllers/userController.js'
import * as roomController from '../controllers/roomController.js'
import * as procurementController from '../controllers/procurementController.js'
import * as staffController from '../controllers/staffController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

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
router.get('/procurement', requireAuth, requireRole('LAB_HEAD'), procurementController.index)
router.post('/procurement', requireAuth, requireRole('LAB_HEAD'), procurementController.store)
router.get('/procurement/inventory', requireAuth, requireRole('LAB_HEAD'), procurementController.inventoryIndex)
router.get('/procurement/:id', requireAuth, requireRole('LAB_HEAD'), procurementController.show)
router.post('/procurement/:id/lock', requireAuth, requireRole('LAB_HEAD'), procurementController.lock)
router.post('/procurement/:id/items', requireAuth, requireRole('LAB_HEAD'), procurementController.addItem)
router.post('/procurement/:id/items/:detailId/delete', requireAuth, requireRole('LAB_HEAD'), procurementController.removeItem)
router.post('/procurement/:id/items/:detailId/edit', requireAuth, requireRole('LAB_HEAD'), procurementController.updateItem)
router.post('/procurement/:id/delete', requireAuth, requireRole('LAB_HEAD'), procurementController.destroy)

// ─── Staf Laboratorium: Pengelolaan & Maintenance ─────────────────────────────
router.get('/staff/bhp', requireAuth, requireRole('LAB_STAFF'), staffController.bhpIndex)
router.post('/staff/bhp/update-stock', requireAuth, requireRole('LAB_STAFF'), staffController.updateBhpStock)
router.get('/staff/maintenance', requireAuth, requireRole('LAB_STAFF'), staffController.maintenanceIndex)
router.post('/staff/maintenance/log', requireAuth, requireRole('LAB_STAFF'), staffController.storeMaintenanceLog)

export default router

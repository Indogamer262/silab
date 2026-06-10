import prisma from '../lib/prisma.js'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('Starting seeding...')

  // Clean up existing data (in reverse dependency order)
  await prisma.maintenanceLog.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.room.deleteMany()
  await prisma.procurementDetail.deleteMany()
  await prisma.procurementDraft.deleteMany()
  await prisma.consumable.deleteMany()
  await prisma.item.deleteMany()
  await prisma.user.deleteMany()

  console.log('Cleared existing data')

  // ──────────────────────────────────────────────
  // Users
  // ──────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password', 10)

  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: 'USR0001',
        email: 'admin@silab.ac.id',
        name: 'Ahmad Fauzi',
        role: 'ADMIN',
        password: hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        id: 'USR0002',
        email: 'labhead@silab.ac.id',
        name: 'Siti Rahayu',
        role: 'LAB_HEAD',
        password: hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        id: 'USR0003',
        email: 'prodihead@silab.ac.id',
        name: 'Budi Santoso',
        role: 'PRODI_HEAD',
        password: hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        id: 'USR0004',
        email: 'adminstaff@silab.ac.id',
        name: 'Dewi Lestari',
        role: 'ADMIN_STAFF',
        password: hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        id: 'USR0005',
        email: 'labstaff@silab.ac.id',
        name: 'Rizky Pratama',
        role: 'LAB_STAFF',
        password: hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        id: 'USR0006',
        email: 'labstaff2@silab.ac.id',
        name: 'Rina Wulandari',
        role: 'LAB_STAFF',
        password: hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        id: 'USR0007',
        email: 'adminstaff2@silab.ac.id',
        name: 'Hendra Wijaya',
        role: 'ADMIN_STAFF',
        password: hashedPassword,
      },
    }),
  ])

  console.log(`Created ${users.length} users`)

  // ──────────────────────────────────────────────
  // Items
  // ──────────────────────────────────────────────
  const items = await Promise.all([
    prisma.item.create({
      data: {
        name: 'Oscilloscope Digital',
        category: 'ELECTRONICS',
        price: 15000000n,
        link: 'https://tokopedia.com/oscilloscope-digital',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Multimeter Fluke 87V',
        category: 'ELECTRONICS',
        price: 8500000n,
        link: 'https://tokopedia.com/multimeter-fluke-87v',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Solder Station Hakko',
        category: 'ELECTRONICS',
        price: 3200000n,
        link: 'https://tokopedia.com/solder-station-hakko',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Meja Laboratorium',
        category: 'NON_ELECTRONICS',
        price: 4500000n,
        link: 'https://tokopedia.com/meja-lab',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Kursi Laboratorium',
        category: 'NON_ELECTRONICS',
        price: 1800000n,
        link: 'https://tokopedia.com/kursi-lab',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Power Supply DC',
        category: 'ELECTRONICS',
        price: 5500000n,
        link: 'https://tokopedia.com/power-supply-dc',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Breadboard Kit',
        category: 'ELECTRONICS',
        price: 250000n,
        link: 'https://tokopedia.com/breadboard-kit',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Rak Penyimpanan Komponen',
        category: 'NON_ELECTRONICS',
        price: 2100000n,
        link: 'https://tokopedia.com/rak-komponen',
      },
    }),
  ])

  console.log(`Created ${items.length} items`)

  // ──────────────────────────────────────────────
  // Consumables (linked to some items)
  // ──────────────────────────────────────────────
  const consumables = await Promise.all([
    prisma.consumable.create({
      data: {
        name: 'Timah Solder 0.8mm',
        unit: 'roll',
        stock: 50,
        itemId: items[2].id, // Solder Station
      },
    }),
    prisma.consumable.create({
      data: {
        name: 'Kabel Jumper Male-Male',
        unit: 'pack',
        stock: 100,
        itemId: items[6].id, // Breadboard Kit
      },
    }),
    prisma.consumable.create({
      data: {
        name: 'Resistor Assortment Kit',
        unit: 'box',
        stock: 30,
        itemId: items[5].id, // Power Supply DC
      },
    }),
    prisma.consumable.create({
      data: {
        name: 'Flux Pasta Solder',
        unit: 'botol',
        stock: 25,
        itemId: items[1].id, // Multimeter
      },
    }),
    prisma.consumable.create({
      data: {
        name: 'PCB Polos FR4',
        unit: 'lembar',
        stock: 200,
        itemId: items[0].id, // Oscilloscope
      },
    }),
  ])

  console.log(`Created ${consumables.length} consumables`)

  // ──────────────────────────────────────────────
  // Rooms
  // ──────────────────────────────────────────────
  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        name: 'Lab Elektronika Dasar',
        location: 'Gedung A Lantai 1',
      },
    }),
    prisma.room.create({
      data: {
        name: 'Lab Sistem Digital',
        location: 'Gedung A Lantai 2',
      },
    }),
    prisma.room.create({
      data: {
        name: 'Lab Mikrokontroler',
        location: 'Gedung B Lantai 1',
      },
    }),
    prisma.room.create({
      data: {
        name: 'Lab Jaringan Komputer',
        location: 'Gedung B Lantai 2',
      },
    }),
    prisma.room.create({
      data: {
        name: 'Lab Telekomunikasi',
        location: 'Gedung C Lantai 1'
      },
    }),
    prisma.room.create({
      data: {
        name: 'Gudang Peralatan',
        location: 'Gedung A Basement',
      },
    }),
  ])

  console.log(`Created ${rooms.length} rooms`)

  // ──────────────────────────────────────────────
  // Procurement Drafts
  // ──────────────────────────────────────────────
  const drafts = await Promise.all([
    prisma.procurementDraft.create({
      data: {
        date: new Date('2026-01-15'),
        userId: users[1].id, // LAB_HEAD
        status: 'LOCKED',
      },
    }),
    prisma.procurementDraft.create({
      data: {
        date: new Date('2026-02-10'),
        userId: users[4].id, // LAB_STAFF
        status: 'DRAFT',
      },
    }),
    prisma.procurementDraft.create({
      data: {
        date: new Date('2026-03-05'),
        userId: users[0].id, // ADMIN
        status: 'LOCKED',
      },
    }),
    prisma.procurementDraft.create({
      data: {
        date: new Date('2026-04-20'),
        userId: users[5].id, // LAB_STAFF 2
        status: 'DRAFT',
      },
    }),
    prisma.procurementDraft.create({
      data: {
        date: new Date('2026-05-01'),
        userId: users[3].id, // ADMIN_STAFF
        status: 'DRAFT',
      },
    }),
  ])

  console.log(`Created ${drafts.length} procurement drafts`)

  // ──────────────────────────────────────────────
  // Procurement Details
  // ──────────────────────────────────────────────
  const procurementDetails = await Promise.all([
    prisma.procurementDetail.create({
      data: {
        quantity: 3,
        price: 45000000n,
        status: 'ACCEPTED',
        draftId: drafts[0].id,
        itemId: items[0].id, // Oscilloscope
      },
    }),
    prisma.procurementDetail.create({
      data: {
        quantity: 5,
        price: 42500000n,
        status: 'ACCEPTED',
        draftId: drafts[0].id,
        itemId: items[1].id, // Multimeter
      },
    }),
    prisma.procurementDetail.create({
      data: {
        quantity: 10,
        price: 32000000n,
        status: 'PENDING',
        draftId: drafts[1].id,
        itemId: items[2].id, // Solder Station
      },
    }),
    prisma.procurementDetail.create({
      data: {
        quantity: 8,
        price: 36000000n,
        status: 'REJECTED',
        draftId: drafts[2].id,
        itemId: items[3].id, // Meja Lab
      },
    }),
    prisma.procurementDetail.create({
      data: {
        quantity: 15,
        price: 27000000n,
        status: 'ACCEPTED',
        draftId: drafts[2].id,
        itemId: items[4].id, // Kursi Lab
      },
    }),
    prisma.procurementDetail.create({
      data: {
        quantity: 4,
        price: 22000000n,
        status: 'PENDING',
        draftId: drafts[3].id,
        itemId: items[5].id, // Power Supply
      },
    }),
    prisma.procurementDetail.create({
      data: {
        quantity: 20,
        price: 5000000n,
        status: 'PENDING',
        draftId: drafts[4].id,
        itemId: items[6].id, // Breadboard Kit
      },
    }),
  ])

  console.log(`Created ${procurementDetails.length} procurement details`)

  // ──────────────────────────────────────────────
  // Inventories
  // ──────────────────────────────────────────────
  const inventories = await Promise.all([
    prisma.inventory.create({
      data: {
        qrCode: 'INV-OSC-001',
        receivedDate: new Date('2025-06-15'),
        condition: 'GOOD',
        itemId: items[0].id,
        roomId: rooms[0].id,
      },
    }),
    prisma.inventory.create({
      data: {
        qrCode: 'INV-OSC-002',
        receivedDate: new Date('2025-06-15'),
        condition: 'GOOD',
        itemId: items[0].id,
        roomId: rooms[1].id,
      },
    }),
    prisma.inventory.create({
      data: {
        qrCode: 'INV-MLT-001',
        receivedDate: new Date('2025-07-20'),
        condition: 'FAIR',
        itemId: items[1].id,
        roomId: rooms[0].id,
      },
    }),
    prisma.inventory.create({
      data: {
        qrCode: 'INV-SLD-001',
        receivedDate: new Date('2025-08-10'),
        condition: 'GOOD',
        itemId: items[2].id,
        roomId: rooms[2].id,
      },
    }),
    prisma.inventory.create({
      data: {
        qrCode: 'INV-MJA-001',
        receivedDate: new Date('2024-03-01'),
        condition: 'POOR',
        itemId: items[3].id,
        roomId: rooms[3].id,
      },
    }),
    prisma.inventory.create({
      data: {
        qrCode: 'INV-KRS-001',
        receivedDate: new Date('2024-03-01'),
        condition: 'BROKEN',
        itemId: items[4].id,
        roomId: rooms[3].id,
      },
    }),
    prisma.inventory.create({
      data: {
        qrCode: 'INV-PWR-001',
        receivedDate: new Date('2025-11-05'),
        condition: 'GOOD',
        itemId: items[5].id,
        roomId: rooms[4].id,
      },
    }),
    prisma.inventory.create({
      data: {
        qrCode: 'INV-BRD-001',
        receivedDate: new Date('2026-01-20'),
        condition: 'GOOD',
        itemId: items[6].id,
        roomId: rooms[2].id,
      },
    }),
    prisma.inventory.create({
      data: {
        qrCode: 'INV-RAK-001',
        receivedDate: new Date('2025-09-12'),
        condition: 'FAIR',
        itemId: items[7].id,
        roomId: rooms[5].id,
      },
    }),
    prisma.inventory.create({
      data: {
        qrCode: 'INV-MLT-002',
        receivedDate: new Date('2025-12-01'),
        condition: 'LOST',
        itemId: items[1].id,
        roomId: rooms[4].id,
      },
    }),
  ])

  console.log(`Created ${inventories.length} inventories`)

  // ──────────────────────────────────────────────
  // Maintenance Logs
  // ──────────────────────────────────────────────
  const maintenanceLogs = await Promise.all([
    prisma.maintenanceLog.create({
      data: {
        date: new Date('2025-09-10'),
        description: 'Kalibrasi oscilloscope rutin tahunan. Semua parameter dalam batas normal.',
        inventoryId: inventories[0].id,
        userId: users[4].id,
      },
    }),
    prisma.maintenanceLog.create({
      data: {
        date: new Date('2025-10-15'),
        description: 'Penggantian probe multimeter yang rusak. Probe baru sudah terpasang dan berfungsi normal.',
        consumableUsedQty: 2,
        inventoryId: inventories[2].id,
        consumableId: consumables[3].id,
        userId: users[4].id,
      },
    }),
    prisma.maintenanceLog.create({
      data: {
        date: new Date('2025-11-20'),
        description: 'Pembersihan dan penggantian tip solder station. Elemen pemanas masih dalam kondisi baik.',
        consumableUsedQty: 3,
        inventoryId: inventories[3].id,
        consumableId: consumables[0].id,
        userId: users[5].id,
      },
    }),
    prisma.maintenanceLog.create({
      data: {
        date: new Date('2026-01-05'),
        description: 'Perbaikan kaki meja laboratorium yang goyang. Dilakukan pengelasan ulang pada sambungan.',
        inventoryId: inventories[4].id,
        userId: users[5].id,
      },
    }),
    prisma.maintenanceLog.create({
      data: {
        date: new Date('2026-02-14'),
        description: 'Pemeriksaan kursi lab, ditemukan bantalan duduk sudah aus. Perlu penggantian.',
        inventoryId: inventories[5].id,
        userId: users[4].id,
      },
    }),
    prisma.maintenanceLog.create({
      data: {
        date: new Date('2026-03-22'),
        description: 'Kalibrasi power supply DC. Output tegangan sudah stabil di semua channel.',
        inventoryId: inventories[6].id,
        userId: users[5].id,
      },
    }),
    prisma.maintenanceLog.create({
      data: {
        date: new Date('2026-04-18'),
        description: 'Pengecekan breadboard kit, beberapa kabel jumper diganti karena putus di dalam insulator.',
        consumableUsedQty: 5,
        inventoryId: inventories[7].id,
        consumableId: consumables[1].id,
        userId: users[4].id,
      },
    }),
  ])

  console.log(`Created ${maintenanceLogs.length} maintenance logs`)
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

# SILAB - Sistem Informasi Inventaris Laboratorium
Pemrograman Web Lanjut - Capstone 2

# Project Capstone 2
Tujuan Projek
* Melakukan digitalisasi aset laboratorium (inventaris) dan barang habis pakai (BHP).
* Menyediakan sistem pengajuan pengadaan aset dan BHP.
* Melakukan pelacakan dari siklus barang (pengadaan, pemeliharaan, penggantian/ penghapusan).

# Roles
Administrator
* Mengelola data pengguna.
* Mengelola data ruangan.

Kepala Laboratorium
* Membuat draf pengadaan barang (tahunan). Draf ini membuat data inventaris dan BHP yang akan dibeli. Data-data yang dicantumkan seperti nama barang, harga, jumlah barang, dan link pembelian. Terdapat opsi untuk menambahkan barang inventaris yang akan digantikan dengan pembelian ini.
* Melihat draf pengadaan barang yang pernah diajukan. Jika draf sudah berstatus locked, maka data tidak dapat diganti.

Ketua Program Studi
* Melakukan review draf pengadaan barang dari kepala laboratorium.
* Kaprodi dapat memilih barang mana yang disetujui atau ditolak pengadaannya.
* Finalisasi draf pengadaan barang. Setelah melakukan finalisasi maka draf sudah tidak dapat diubah.

Staf Administrasi
* Melihat draf pengadaan barang yang telah disetujui oleh ketua program studi.
* Melakukan update inventaris misal dengan memberikan penomoran label dan foto QR/ Barcode
* Melakukan input tanggal penerimaan barang (Barang yang dibeli bisa datang tidak secara bersamaan).

Staf Laboratorium
* Mengelola stok BHP.
* Melakukan log maintenance dan update kondisi barang inventaris. Jika selama proses maintenance ada BHP yang digunakan, maka stok dalam sistem juga harus berkurang.
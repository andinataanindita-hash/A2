
/* ==========================================================
   A2 KENANGAN — GALERI FOTO & ARSIP CERITA
   Foto: pratinjau unggahan bersifat sementara.
   Cerita: disimpan secara lokal memakai IndexedDB browser.
   Format cerita: .txt dan .docx (Word modern).
   ========================================================== */

const photos = [
  {
    id: 1,
    title: "Senja yang tenang",
    category: "perjalanan",
    categoryLabel: "Perjalanan",
    description: "Ganti ilustrasi ini dengan foto senja atau perjalanan kalian.",
    src: "assets/foto-01.jpg",
    alt: "Ilustrasi langit senja sebagai foto contoh"
  },
  {
    id: 2,
    title: "Momen sederhana",
    category: "sederhana",
    categoryLabel: "Momen sederhana",
    description: "Hal kecil yang tetap menyenangkan untuk diingat.",
    src: "assets/foto-02.jpg",
    alt: "Ilustrasi bunga sebagai foto contoh"
  },
  {
    id: 3,
    title: "Waktu bersama",
    category: "kebersamaan",
    categoryLabel: "Kebersamaan",
    description: "Simpan foto favorit kalian di bagian ini.",
    src: "assets/foto-03.jpg",
    alt: "Ilustrasi dua siluet sebagai foto contoh"
  },
  {
    id: 4,
    title: "Cerita di sore hari",
    category: "perjalanan",
    categoryLabel: "Perjalanan",
    description: "Satu tempat, satu waktu, dan cerita yang berbeda.",
    src: "assets/foto-04.jpg",
    alt: "Ilustrasi pemandangan sebagai foto contoh"
  },
  {
    id: 5,
    title: "Senyum hari itu",
    category: "kebersamaan",
    categoryLabel: "Kebersamaan",
    description: "Ubah gambar contoh ini dengan foto kalian sendiri.",
    src: "assets/foto-05.jpg",
    alt: "Ilustrasi bentuk hati sebagai foto contoh"
  },
  {
    id: 6,
    title: "Hari yang istimewa",
    category: "sederhana",
    categoryLabel: "Momen sederhana",
    description: "Tambahkan tanggal atau cerita singkat sesuai momen aslinya.",
    src: "assets/foto-06.jpg",
    alt: "Ilustrasi langit malam sebagai foto contoh"
  }
];

/* ==========================================================
   1. MENGAMBIL ELEMENT HTML
   ========================================================== */

const galleryGrid = document.getElementById("galleryGrid");
const emptyState = document.getElementById("emptyState");
const photoCount = document.getElementById("photoCount");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-button");
const photoUpload = document.getElementById("photoUpload");
const uploadNote = document.getElementById("uploadNote");

const photoModal = document.getElementById("photoModal");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalCategory = document.getElementById("modalCategory");
const modalDescription = document.getElementById("modalDescription");
const modalClose = document.getElementById("modalClose");

let activeFilter = "all";
let searchTerm = "";
let uploadedPhotos = [];

/* ==========================================================
   2. KEAMANAN TEKS HTML
   ========================================================== */

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

/* ==========================================================
   3. SISTEM GALERI FOTO
   ========================================================== */

function getVisiblePhotos() {
  const allPhotos = [...uploadedPhotos, ...photos];

  return allPhotos.filter((photo) => {
    const matchesFilter =
      activeFilter === "all" ||
      photo.category === activeFilter;

    const searchableText =
      `${photo.title} ${photo.description} ${photo.categoryLabel}`.toLowerCase();

    return matchesFilter &&
      searchableText.includes(searchTerm.toLowerCase());
  });
}

function renderGallery() {
  const visiblePhotos = getVisiblePhotos();

  galleryGrid.innerHTML = visiblePhotos.map((photo) => `
    <article
      class="photo-card"
      tabindex="0"
      role="button"
      aria-label="Buka foto: ${escapeHTML(photo.title)}"
      data-photo-id="${escapeHTML(photo.id)}"
    >
      <div class="photo-image-wrap">
        <img
          src="${escapeHTML(photo.src)}"
          alt="${escapeHTML(photo.alt)}"
          loading="lazy"
        />
        <span class="photo-open-hint">LIHAT FOTO ↗</span>
      </div>

      <div class="photo-meta">
        <div>
          <h3>${escapeHTML(photo.title)}</h3>
          <p class="photo-description">
            ${escapeHTML(photo.description)}
          </p>
        </div>

        <span class="photo-category">
          ${escapeHTML(photo.categoryLabel)}
        </span>
      </div>
    </article>
  `).join("");

  emptyState.hidden = visiblePhotos.length !== 0;

  photoCount.textContent =
    String(uploadedPhotos.length + photos.length);

  galleryGrid.querySelectorAll(".photo-card").forEach((card) => {

    const openCard = () => {
      const selectedPhoto = [...uploadedPhotos, ...photos]
        .find((photo) =>
          String(photo.id) === card.dataset.photoId
        );

      if (selectedPhoto) {
        openPhoto(selectedPhoto);
      }
    };

    card.addEventListener("click", openCard);

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCard();
      }
    });

  });
}

/* Membuka foto dalam tampilan besar */

function openPhoto(photo) {
  modalImage.src = photo.src;
  modalImage.alt = photo.alt;

  modalTitle.textContent = photo.title;
  modalCategory.textContent = photo.categoryLabel;
  modalDescription.textContent = photo.description;

  photoModal.showModal();
}

/* ==========================================================
   4. FILTER DAN PENCARIAN FOTO
   ========================================================== */

filterButtons.forEach((button) => {

  button.addEventListener("click", () => {

    filterButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    activeFilter = button.dataset.filter;

    renderGallery();

  });

});

/* Pencarian foto berdasarkan judul atau deskripsi */

searchInput.addEventListener("input", (event) => {

  searchTerm = event.target.value.trim();

  renderGallery();

});

/* ==========================================================
   5. UPLOAD FOTO SEMENTARA
   ========================================================== */

photoUpload.addEventListener("change", (event) => {

  const selectedFiles = Array.from(
    event.target.files || []
  );

  const imageFiles = selectedFiles.filter((file) =>
    file.type.startsWith("image/")
  );

  const acceptableFiles = imageFiles.filter((file) =>
    file.size <= 10 * 1024 * 1024
  );

  const tooLargeCount =
    imageFiles.length - acceptableFiles.length;

  if (tooLargeCount) {
    uploadNote.textContent =
      `${tooLargeCount} foto dilewati karena ukurannya lebih dari 10 MB.`;
  } else if (acceptableFiles.length) {
    uploadNote.textContent =
      "Foto ditambahkan sebagai pratinjau sementara. Untuk menampilkannya pada semua pengunjung, tambahkan file ke folder assets di GitHub.";
  }

  acceptableFiles.forEach((file, index) => {

    uploadedPhotos.unshift({

      id: `upload-${Date.now()}-${index}`,

      title: file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " "),

      category: "kebersamaan",

      categoryLabel: "Foto unggahan",

      description: "Pratinjau sementara dari perangkat ini.",

      src: URL.createObjectURL(file),

      alt: file.name,

      temporary: true

    });

  });

  if (acceptableFiles.length) {

    activeFilter = "all";

    filterButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.filter === "all"
      );
    });

    searchInput.value = "";
    searchTerm = "";

    renderGallery();

  } else if (!tooLargeCount) {

    uploadNote.textContent =
      "Pilih file gambar yang valid untuk menambah pratinjau.";

  }

  photoUpload.value = "";

});

/* Menutup tampilan foto */

modalClose.addEventListener("click", () => {
  photoModal.close();
});

photoModal.addEventListener("click", (event) => {

  if (event.target === photoModal) {
    photoModal.close();
  }

});

/* ==========================================================
   6. SISTEM CERITA — INDEXEDDB
   ========================================================== */

const STORY_DB_NAME = "a2-kenangan-story-library";
const STORY_DB_VERSION = 1;
const STORY_STORE = "stories";

const MAX_STORY_SIZE = 5 * 1024 * 1024;

const storyFileInput =
  document.getElementById("storyFileInput");

const storyTitleInput =
  document.getElementById("storyTitleInput");

const storyStatus =
  document.getElementById("storyStatus");

const storiesGrid =
  document.getElementById("storiesGrid");

const emptyStories =
  document.getElementById("emptyStories");

const storyCount =
  document.getElementById("storyCount");

const storyModal =
  document.getElementById("storyModal");

const storyModalClose =
  document.getElementById("storyModalClose");

const storyModalDate =
  document.getElementById("storyModalDate");

const storyModalTitle =
  document.getElementById("storyModalTitle");

const storyReader =
  document.getElementById("storyReader");

const storyDownloadButton =
  document.getElementById("storyDownloadButton");

const storyDeleteButton =
  document.getElementById("storyDeleteButton");

let savedStories = [];
let activeStoryId = null;

/* Mengatur pesan status */

function setStoryStatus(message, type = "") {

  storyStatus.textContent = message;

  storyStatus.classList.remove("success", "error");

  if (type) {
    storyStatus.classList.add(type);
  }

}

/* ==========================================================
   7. MEMBUKA DATABASE
   ========================================================== */

function openStoryDatabase() {

  return new Promise((resolve, reject) => {

    if (!("indexedDB" in window)) {

      reject(
        new Error(
          "Browser ini belum mendukung penyimpanan cerita."
        )
      );

      return;
    }

    const request = indexedDB.open(
      STORY_DB_NAME,
      STORY_DB_VERSION
    );

    request.onupgradeneeded = () => {

      const database = request.result;

      if (!database.objectStoreNames.contains(STORY_STORE)) {

        const store = database.createObjectStore(
          STORY_STORE,
          { keyPath: "id" }
        );

        store.createIndex(
          "createdAt",
          "createdAt",
          { unique: false }
        );

      }

    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {

      reject(
        request.error ||
        new Error("Tidak dapat membuka penyimpanan cerita.")
      );

    };

  });

}

/* ==========================================================
   8. MEMBACA SEMUA CERITA
   ========================================================== */

async function readAllStories() {

  const database = await openStoryDatabase();

  return new Promise((resolve, reject) => {

    const transaction = database.transaction(
      STORY_STORE,
      "readonly"
    );

    const request = transaction
      .objectStore(STORY_STORE)
      .getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {

      reject(
        request.error ||
        new Error("Gagal membaca arsip cerita.")
      );

    };

    transaction.oncomplete = () => {
      database.close();
    };

    transaction.onerror = () => {

      database.close();

      reject(transaction.error);

    };

  });

}

/* ==========================================================
   9. MENYIMPAN CERITA KE DATABASE
   ========================================================== */

async function saveStoryToDatabase(story) {

  const database = await openStoryDatabase();

  return new Promise((resolve, reject) => {

    const transaction = database.transaction(
      STORY_STORE,
      "readwrite"
    );

    transaction.objectStore(STORY_STORE).put(story);

    transaction.oncomplete = () => {

      database.close();

      resolve();

    };

    transaction.onerror = () => {

      const error = transaction.error;

      database.close();

      reject(
        error ||
        new Error("Cerita tidak dapat disimpan.")
      );

    };

    transaction.onabort = () => {

      const error = transaction.error;

      database.close();

      reject(
        error ||
        new Error("Penyimpanan cerita dibatalkan.")
      );

    };

  });

}

/* ==========================================================
   10. MENGHAPUS CERITA DARI DATABASE
   ========================================================== */

async function removeStoryFromDatabase(id) {

  const database = await openStoryDatabase();

  return new Promise((resolve, reject) => {

    const transaction = database.transaction(
      STORY_STORE,
      "readwrite"
    );

    transaction.objectStore(STORY_STORE).delete(id);

    transaction.oncomplete = () => {

      database.close();

      resolve();

    };

    transaction.onerror = () => {

      const error = transaction.error;

      database.close();

      reject(
        error ||
        new Error("Cerita tidak dapat dihapus.")
      );

    };

  });

}

/* ==========================================================
   11. FORMAT TANGGAL CERITA
   ========================================================== */

function formatStoryDate(timestamp) {

  return new Intl.DateTimeFormat("id-ID", {

    day: "numeric",
    month: "long",
    year: "numeric"

  }).format(new Date(timestamp));

}

/* ==========================================================
   12. MENAMPILKAN DAFTAR CERITA
   ========================================================== */

function renderStories() {

  const orderedStories = [...savedStories].sort(
    (a, b) => b.createdAt - a.createdAt
  );

  storyCount.textContent =
    `${orderedStories.length} cerita`;

  emptyStories.hidden =
    orderedStories.length > 0;

  storiesGrid.innerHTML = orderedStories.map((story) => `

    <article
      class="story-card"
      data-story-id="${escapeHTML(story.id)}"
    >

      <div class="story-card-top">

        <span class="story-file-type">
          ${escapeHTML(story.extension.toUpperCase())} · CERITA
        </span>

        <span class="story-card-date">
          ${escapeHTML(formatStoryDate(story.createdAt))}
        </span>

      </div>

      <h4>${escapeHTML(story.title)}</h4>

      <p class="story-card-preview">
        ${escapeHTML(story.content.slice(0, 260))}
      </p>

      <div class="story-card-actions">

        <button
          class="text-button"
          type="button"
          data-story-action="read"
          data-story-id="${escapeHTML(story.id)}"
        >
          Baca cerita ↗
        </button>

        <button
          class="text-button"
          type="button"
          data-story-action="download"
          data-story-id="${escapeHTML(story.id)}"
        >
          Unduh ↓
        </button>

      </div>

    </article>

  `).join("");

}

/* ==========================================================
   13. MEMBUAT ID CERITA
   ========================================================== */

function makeStoryId() {

  return window.crypto &&
    typeof crypto.randomUUID === "function"

    ? crypto.randomUUID()

    : `story-${Date.now()}-${Math.random()
        .toString(16).slice(2)}`;

}

/* ==========================================================
   14. MEMBACA FILE TXT DAN WORD DOCX
   ========================================================== */

async function extractStoryText(file, extension) {

  // Membaca file TXT

  if (extension === "txt") {

    return (await file.text())
      .replace(/^\uFEFF/, "");

  }

  // Membaca file Word DOCX

  if (extension === "docx") {

    if (
      !window.mammoth ||
      typeof window.mammoth.extractRawText !== "function"
    ) {

      throw new Error(
        "Pembaca Word belum termuat. Periksa koneksi internet lalu muat ulang halaman."
      );

    }

    const arrayBuffer = await file.arrayBuffer();

    const result = await window.mammoth.extractRawText({
      arrayBuffer
    });

    return result.value || "";

  }

  // Format DOC lama belum didukung

  if (extension === "doc") {

    throw new Error(
      "Format .doc lama belum didukung. Buka file di Microsoft Word lalu simpan sebagai .docx atau .txt."
    );

  }

  throw new Error(
    "Format belum didukung. Gunakan file .txt atau .docx."
  );

}

/* ==========================================================
   15. UPLOAD DAN MENYIMPAN CERITA
   ========================================================== */

storyFileInput.addEventListener("change", async (event) => {

  const file = event.target.files &&
    event.target.files[0];

  if (!file) return;

  const extension = file.name
    .split(".")
    .pop()
    .toLowerCase();

  try {

    if (file.size > MAX_STORY_SIZE) {

      throw new Error(
        "Ukuran file terlalu besar. Batas maksimal cerita adalah 5 MB."
      );

    }

    if (!["txt", "docx", "doc"].includes(extension)) {

      throw new Error(
        "Pilih file .txt atau .docx."
      );

    }

    setStoryStatus("Membaca file cerita…");

    const content = (
      await extractStoryText(file, extension)
    ).trim();

    if (!content) {

      throw new Error(
        "File tidak berisi teks yang dapat dibaca. Periksa kembali file tersebut."
      );

    }

    const suggestedTitle = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]+/g, " ")
      .trim();

    const story = {

      id: makeStoryId(),

      title:
        storyTitleInput.value.trim() ||
        suggestedTitle ||
        "Cerita tanpa judul",

      fileName: file.name,

      extension: extension,

      content: content,

      createdAt: Date.now(),

      fileBlob: file

    };

    await saveStoryToDatabase(story);

    savedStories = await readAllStories();

    renderStories();

    storyTitleInput.value = "";

    setStoryStatus(
      `“${story.title}” berhasil ditambahkan ke arsip cerita pada perangkat ini.`,
      "success"
    );

  } catch (error) {

    setStoryStatus(
      error.message ||
      "Terjadi kesalahan saat membaca file cerita.",
      "error"
    );

  } finally {

    storyFileInput.value = "";

  }

});

/* ==========================================================
   16. MENGUNDUH FILE CERITA ASLI
   ========================================================== */

function downloadStory(story) {

  if (!story || !story.fileBlob) {

    setStoryStatus(
      "File asli cerita tidak ditemukan di penyimpanan browser.",
      "error"
    );

    return;

  }

  const url = URL.createObjectURL(story.fileBlob);

  const link = document.createElement("a");

  link.href = url;

  link.download =
    story.fileName ||
    `${story.title}.${story.extension}`;

  document.body.appendChild(link);

  link.click();

  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);

}

/* ==========================================================
   17. MEMBACA CERITA DI WEBSITE
   ========================================================== */

function openStory(story) {

  if (!story) return;

  activeStoryId = story.id;

  storyModalDate.textContent =
    `${story.extension.toUpperCase()} · DITAMBAHKAN ${formatStoryDate(story.createdAt)}`;

  storyModalTitle.textContent = story.title;

  storyReader.textContent = story.content;

  storyModal.showModal();

}

/* ==========================================================
   18. TOMBOL BACA DAN UNDUH CERITA
   ========================================================== */

storiesGrid.addEventListener("click", (event) => {

  const button = event.target.closest(
    "button[data-story-action]"
  );

  if (!button) return;

  const story = savedStories.find(
    (item) => item.id === button.dataset.storyId
  );

  if (!story) return;

  if (button.dataset.storyAction === "read") {
    openStory(story);
  }

  if (button.dataset.storyAction === "download") {
    downloadStory(story);
  }

});

/* Tombol unduh dari tampilan cerita */

storyDownloadButton.addEventListener("click", () => {

  const story = savedStories.find(
    (item) => item.id === activeStoryId
  );

  downloadStory(story);

});

/* ==========================================================
   19. MENGHAPUS CERITA
   ========================================================== */

storyDeleteButton.addEventListener("click", async () => {

  const story = savedStories.find(
    (item) => item.id === activeStoryId
  );

  if (!story) return;

  const shouldDelete = window.confirm(
    `Hapus cerita “${story.title}” dari arsip pada perangkat ini?`
  );

  if (!shouldDelete) return;

  try {

    await removeStoryFromDatabase(story.id);

    savedStories = await readAllStories();

    renderStories();

    storyModal.close();

    activeStoryId = null;

    setStoryStatus(
      "Cerita berhasil dihapus dari arsip perangkat ini.",
      "success"
    );

  } catch (error) {

    setStoryStatus(
      error.message ||
      "Cerita gagal dihapus.",
      "error"
    );

  }

});

/* ==========================================================
   20. MENUTUP TAMPILAN CERITA
   ========================================================== */

storyModalClose.addEventListener("click", () => {

  storyModal.close();

});

storyModal.addEventListener("click", (event) => {

  if (event.target === storyModal) {
    storyModal.close();
  }

});

/* ==========================================================
   21. MEMUAT CERITA SAAT WEBSITE DIBUKA
   ========================================================== */

async function initializeStories() {

  try {

    savedStories = await readAllStories();

    renderStories();

  } catch (error) {

    setStoryStatus(
      "Penyimpanan cerita tidak tersedia di browser ini. Coba browser lain atau buka melalui GitHub Pages.",
      "error"
    );

    emptyStories.hidden = false;

  }

}

/* ==========================================================
   22. MENU NAVIGASI RESPONSIF
   ========================================================== */

const menuToggle =
  document.getElementById("menuToggle");

const mainNav =
  document.getElementById("mainNav");

menuToggle.addEventListener("click", () => {

  const isOpen = mainNav.classList.toggle("open");

  menuToggle.setAttribute(
    "aria-expanded",
    String(isOpen)
  );

  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Tutup menu" : "Buka menu"
  );

});

mainNav.querySelectorAll("a").forEach((link) => {

  link.addEventListener("click", () => {

    mainNav.classList.remove("open");

    menuToggle.setAttribute(
      "aria-expanded",
      "false"
    );

    menuToggle.setAttribute(
      "aria-label",
      "Buka menu"
    );

  });

});

/* ==========================================================
   23. TAHUN FOOTER DAN INISIALISASI WEBSITE
   ========================================================== */

document.getElementById("currentYear").textContent =
  String(new Date().getFullYear());

renderGallery();

initializeStories();

/* ==========================================================
   AKHIR SCRIPT — A2 KENANGAN BERSAMA SELAMANYA
   ANDINATA ANINDITA
   ========================================================== */

/* ==========================================================
   A2 KENANGAN — GALERI FOTO CLOUD + ARSIP CERITA
   Foto: Supabase Storage + tabel photos.
   Cerita: IndexedDB lokal.
   ========================================================== */

const SUPABASE_URL = "https://ttznlvfihdriqxfojnpy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ypSzmYyCIflppu_mtMUeLQ_kDTjIkzn";
const SUPABASE_BUCKET = "album-foto";
const SUPABASE_TABLE = "photos";

const photos = [
  { id: 1, title: "Senja yang tenang", category: "perjalanan", categoryLabel: "Perjalanan", description: "Ganti ilustrasi ini dengan foto senja atau perjalanan kalian.", src: "assets/foto-01.jpg", alt: "Ilustrasi langit senja sebagai foto contoh" },
  { id: 2, title: "Momen sederhana", category: "sederhana", categoryLabel: "Momen sederhana", description: "Hal kecil yang tetap menyenangkan untuk diingat.", src: "assets/foto-02.jpg", alt: "Ilustrasi bunga sebagai foto contoh" },
  { id: 3, title: "Waktu bersama", category: "kebersamaan", categoryLabel: "Kebersamaan", description: "Simpan foto favorit kalian di bagian ini.", src: "assets/foto-03.jpg", alt: "Ilustrasi dua siluet sebagai foto contoh" },
  { id: 4, title: "Cerita di sore hari", category: "perjalanan", categoryLabel: "Perjalanan", description: "Satu tempat, satu waktu, dan cerita yang berbeda.", src: "assets/foto-04.jpg", alt: "Ilustrasi pemandangan sebagai foto contoh" },
  { id: 5, title: "Senyum hari itu", category: "kebersamaan", categoryLabel: "Kebersamaan", description: "Ubah gambar contoh ini dengan foto kalian sendiri.", src: "assets/foto-05.jpg", alt: "Ilustrasi bentuk hati sebagai foto contoh" },
  { id: 6, title: "Hari yang istimewa", category: "sederhana", categoryLabel: "Momen sederhana", description: "Tambahkan tanggal atau cerita singkat sesuai momen aslinya.", src: "assets/foto-06.jpg", alt: "Ilustrasi langit malam sebagai foto contoh" }
];

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
let cloudPhotos = [];
let supabaseClient = null;
let currentUser = null;
let selectedPhoto = null;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function categoryName(category) {
  return ({
    kebersamaan: "Kebersamaan",
    perjalanan: "Perjalanan",
    sederhana: "Momen sederhana"
  })[category] || "Lainnya";
}

function setCloudStatus(message, error = false) {
  const el = document.getElementById("cloudAuthStatus");
  if (el) {
    el.textContent = message;
    el.style.color = error ? "#ff9b9b" : "";
  }
}

function createCloudControls() {
  if (document.getElementById("cloudPhotoControls")) return;

  const panel = document.createElement("section");
  panel.id = "cloudPhotoControls";
  panel.style.cssText = "margin:18px 0;padding:18px;border:1px solid rgba(190,160,120,.35);border-radius:14px;background:rgba(20,20,24,.55);color:inherit";
  panel.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap">
      <div><strong>Pengelolaan album</strong>
        <p id="cloudAuthStatus" style="margin:6px 0 0;font-size:.9em;opacity:.85">Menghubungkan ke Supabase…</p>
      </div>
      <button type="button" id="cloudLogoutButton" hidden>Keluar</button>
    </div>
    <form id="cloudLoginForm" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <input id="cloudEmail" type="email" autocomplete="username" placeholder="Email pemilik" required style="min-width:180px;flex:1;padding:10px;border-radius:8px">
      <input id="cloudPassword" type="password" autocomplete="current-password" placeholder="Kata sandi" required style="min-width:180px;flex:1;padding:10px;border-radius:8px">
      <button type="submit">Masuk sebagai pemilik</button>
    </form>
    <p style="font-size:.82em;opacity:.72;margin:10px 0 0">Pengunjung dapat melihat foto. Pengelolaan foto hanya tersedia setelah akun pemilik masuk.</p>`;

  const anchor = photoUpload?.parentElement;
  if (anchor?.parentElement) anchor.parentElement.insertBefore(panel, anchor);
  else galleryGrid?.parentElement?.prepend(panel);

  const style = document.createElement("style");
  style.textContent = `
    .cloud-photo-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
    .cloud-photo-actions button{font:inherit;font-size:.78rem;padding:7px 10px;border-radius:7px;cursor:pointer}
    #cloudPhotoControls input{background:#fff;color:#222;border:1px solid #aaa}
    #cloudPhotoControls button{cursor:pointer;padding:9px 13px;border-radius:8px}
  `;
  document.head.appendChild(style);

  document.getElementById("cloudLoginForm").addEventListener("submit", signInOwner);
  document.getElementById("cloudLogoutButton").addEventListener("click", signOutOwner);
}

function updateOwnerControls() {
  const loginForm = document.getElementById("cloudLoginForm");
  const logoutButton = document.getElementById("cloudLogoutButton");

  if (loginForm) loginForm.hidden = Boolean(currentUser);
  if (logoutButton) logoutButton.hidden = !currentUser;

  setCloudStatus(currentUser
    ? `Masuk sebagai ${currentUser.email}. Pengelolaan foto aktif.`
    : "Mode pengunjung: foto dapat dilihat. Masuk untuk mengelola foto.");

  renderGallery();
}

function loadSupabaseLibrary() {
  return new Promise((resolve, reject) => {
    if (window.supabase?.createClient) return resolve();

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    script.onload = () => window.supabase?.createClient
      ? resolve()
      : reject(new Error("Library Supabase gagal dimuat."));

    script.onerror = () => reject(new Error("Tidak dapat memuat Supabase. Periksa koneksi internet."));

    document.head.appendChild(script);
  });
}

async function initializeCloudPhotos() {
  createCloudControls();

  if (SUPABASE_URL.startsWith("MASUKKAN_") || SUPABASE_ANON_KEY.startsWith("MASUKKAN_")) {
    setCloudStatus("Isi Project URL dan Publishable key Supabase di bagian atas script.js.", true);
    renderGallery();
    return;
  }

  try {
    await loadSupabaseLibrary();

    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    currentUser = data.session?.user || null;

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      updateOwnerControls();
    });

    await loadCloudPhotos();
    updateOwnerControls();

  } catch (error) {
    setCloudStatus(`Koneksi Supabase bermasalah: ${error.message}`, true);
    renderGallery();
  }
}

async function signInOwner(event) {
  event.preventDefault();

  const email = document.getElementById("cloudEmail").value.trim();
  const password = document.getElementById("cloudPassword").value;

  setCloudStatus("Memeriksa akun…");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setCloudStatus(`Tidak dapat masuk: ${error.message}`, true);
    return;
  }

  currentUser = data.user;
  document.getElementById("cloudPassword").value = "";
  updateOwnerControls();
}

async function signOutOwner() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    return setCloudStatus(`Gagal keluar: ${error.message}`, true);
  }

  currentUser = null;
  updateOwnerControls();
}

async function loadCloudPhotos() {
  const { data, error } = await supabaseClient
    .from(SUPABASE_TABLE)
    .select("id,name,title,category,description,image_path,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    setCloudStatus(`Gagal mengambil data foto: ${error.message}`, true);
    return;
  }

  cloudPhotos = (data || []).map((row) => {
    const { data: urlData } = supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(row.image_path);

    return {
      id: row.id,
      name: row.name,
      title: row.title,
      category: row.category,
      categoryLabel: categoryName(row.category),
      description: row.description || "",
      src: urlData.publicUrl,
      alt: row.name || row.title,
      image_path: row.image_path,
      cloud: true
    };
  });

  renderGallery();
}

function getVisiblePhotos() {
  return [...cloudPhotos, ...photos].filter((photo) => {
    const matchesFilter = activeFilter === "all" || photo.category === activeFilter;

    const searchable = `${photo.name || ""} ${photo.title} ${photo.description} ${photo.categoryLabel}`.toLowerCase();

    return matchesFilter && searchable.includes(searchTerm.toLowerCase());
  });
}

function renderGallery() {
  if (!galleryGrid || !emptyState || !photoCount) return;

  const visible = getVisiblePhotos();

  galleryGrid.innerHTML = visible.map((photo) => `
    <article class="photo-card" tabindex="0" role="button"
      aria-label="Buka foto: ${escapeHTML(photo.title)}"
      data-photo-id="${escapeHTML(photo.id)}">
      <div class="photo-image-wrap">
        <img src="${escapeHTML(photo.src)}" alt="${escapeHTML(photo.alt)}" loading="lazy">
        <span class="photo-open-hint">LIHAT FOTO ↗</span>
      </div>
      <div class="photo-meta">
        <div>
          <h3>${escapeHTML(photo.title)}</h3>
          <p class="photo-description">${escapeHTML(photo.description)}</p>
        </div>
        <span class="photo-category">${escapeHTML(photo.categoryLabel)}</span>
        ${photo.cloud ? `<small style="display:block;opacity:.7;margin-top:5px">${escapeHTML(photo.name)}</small>` : ""}
        ${currentUser && photo.cloud ? `
          <div class="cloud-photo-actions">
            <button type="button" data-photo-action="edit" data-photo-id="${escapeHTML(photo.id)}">Edit informasi</button>
            <button type="button" data-photo-action="delete" data-photo-id="${escapeHTML(photo.id)}">Hapus</button>
          </div>` : ""}
      </div>
    </article>`).join("");

  emptyState.hidden = visible.length > 0;
  photoCount.textContent = String(cloudPhotos.length + photos.length);

  galleryGrid.querySelectorAll(".photo-card").forEach((card) => {
    const open = () => {
      const photo = [...cloudPhotos, ...photos].find(
        (item) => String(item.id) === card.dataset.photoId
      );

      if (photo) openPhoto(photo);
    };

    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      open();
    });

    card.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button")) {
        event.preventDefault();
        open();
      }
    });
  });
}

function openPhoto(photo) {
  selectedPhoto = photo;

  modalImage.src = photo.src;
  modalImage.alt = photo.alt;
  modalTitle.textContent = photo.title;
  modalCategory.textContent = photo.categoryLabel;
  modalDescription.textContent = photo.description;

  photoModal.showModal();
}
async function uploadCloudPhotos(files) {
  if (!currentUser) {
    setCloudStatus("Masuk sebagai pemilik terlebih dahulu untuk mengunggah foto.", true);
    return;
  }

  let uploaded = 0;

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;

    if (file.size > 10 * 1024 * 1024) {
      setCloudStatus(`${file.name} dilewati karena ukurannya lebih dari 10 MB.`, true);
      continue;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${crypto.randomUUID()}-${safeName}`;
    const title = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]/g, " ");

    const { error: storageError } = await supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (storageError) {
      setCloudStatus(`Gagal mengunggah ${file.name}: ${storageError.message}`, true);
      continue;
    }

    const { error: databaseError } = await supabaseClient
      .from(SUPABASE_TABLE)
      .insert({
        name: file.name,
        title,
        category: "kebersamaan",
        description: "",
        image_path: path
      });

    if (databaseError) {
      await supabaseClient.storage
        .from(SUPABASE_BUCKET)
        .remove([path]);

      setCloudStatus(`Data ${file.name} gagal disimpan: ${databaseError.message}`, true);
      continue;
    }

    uploaded++;
  }

  await loadCloudPhotos();

  setCloudStatus(`${uploaded} foto berhasil disimpan di cloud dan tersedia lintas perangkat.`);
}

async function editCloudPhoto(photo) {
  if (!currentUser || !photo?.cloud) return;

  const name = window.prompt("Nama foto/file:", photo.name);
  if (name === null) return;

  const title = window.prompt("Judul foto:", photo.title);
  if (title === null) return;

  const category = window.prompt(
    "Kategori (kebersamaan / perjalanan / sederhana):",
    photo.category
  );
  if (category === null) return;

  const description = window.prompt("Deskripsi foto:", photo.description);
  if (description === null) return;

  const validCategories = [
    "kebersamaan",
    "perjalanan",
    "sederhana"
  ];

  if (!name.trim() || !title.trim() || !validCategories.includes(category.trim())) {
    setCloudStatus(
      "Nama dan judul wajib diisi. Kategori harus kebersamaan, perjalanan, atau sederhana.",
      true
    );
    return;
  }

  const { error } = await supabaseClient
    .from(SUPABASE_TABLE)
    .update({
      name: name.trim(),
      title: title.trim(),
      category: category.trim(),
      description: description.trim()
    })
    .eq("id", photo.id);

  if (error) {
    return setCloudStatus(`Gagal mengedit informasi foto: ${error.message}`, true);
  }

  await loadCloudPhotos();
  setCloudStatus("Informasi foto berhasil diperbarui.");
}

async function deleteCloudPhoto(id) {
  const photo = cloudPhotos.find(
    (item) => String(item.id) === String(id)
  );

  if (!photo || !currentUser) return;

  if (!confirm(`Yakin ingin menghapus foto "${photo.title}"?`)) return;

  const { error: rowError } = await supabaseClient
    .from(SUPABASE_TABLE)
    .delete()
    .eq("id", photo.id);

  if (rowError) {
    return setCloudStatus(`Gagal menghapus data foto: ${rowError.message}`, true);
  }

  const { error: fileError } = await supabaseClient.storage
    .from(SUPABASE_BUCKET)
    .remove([photo.image_path]);

  await loadCloudPhotos();

  if (fileError) {
    setCloudStatus(
      `Data terhapus, tetapi file Storage gagal dihapus: ${fileError.message}`,
      true
    );
  } else {
    setCloudStatus("Foto berhasil dihapus dari album.");
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("active"));

    button.classList.add("active");
    activeFilter = button.dataset.filter;

    renderGallery();
  });
});

searchInput?.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim();
  renderGallery();
});

photoUpload?.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);

  if (!files.length) return;

  if (!currentUser) {
    if (uploadNote) {
      uploadNote.textContent = "Masuk sebagai pemilik untuk mengunggah foto ke cloud.";
    }

    setCloudStatus("Silakan masuk sebagai pemilik sebelum mengunggah foto.", true);

  } else {
    if (uploadNote) {
      uploadNote.textContent = "Foto sedang diunggah ke cloud…";
    }

    await uploadCloudPhotos(files);

    if (uploadNote) {
      uploadNote.textContent = "Unggahan selesai. Foto tersimpan di cloud.";
    }
  }

  photoUpload.value = "";
});

galleryGrid?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-photo-action]");

  if (!button) return;

  event.preventDefault();
  event.stopPropagation();

  const photo = cloudPhotos.find(
    (item) => String(item.id) === String(button.dataset.photoId)
  );

  if (!photo) return;

  if (button.dataset.photoAction === "edit") {
    await editCloudPhoto(photo);
  }

  if (button.dataset.photoAction === "delete") {
    await deleteCloudPhoto(photo.id);
  }
});

modalClose?.addEventListener("click", () => photoModal.close());

photoModal?.addEventListener("click", (event) => {
  if (event.target === photoModal) {
    photoModal.close();
  }
});

createCloudControls();
renderGallery();
initializeCloudPhotos();


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

function setStoryStatus(message, type = "") {
  storyStatus.textContent = message;

  storyStatus.classList.remove("success", "error");

  if (type) {
    storyStatus.classList.add(type);
  }
}

function openStoryDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(
        new Error("Browser ini belum mendukung penyimpanan cerita.")
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

function formatStoryDate(timestamp) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(timestamp));
}

function renderStories() {
  const orderedStories = [...savedStories].sort(
    (a, b) => b.createdAt - a.createdAt
  );

  storyCount.textContent = `${orderedStories.length} cerita`;

  emptyStories.hidden = orderedStories.length > 0;

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

function makeStoryId() {
  return window.crypto &&
    typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `story-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
async function extractStoryText(file, extension) {
  if (extension === "txt") {
    return (await file.text()).replace(/^\uFEFF/, "");
  }

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

  if (extension === "doc") {
    throw new Error(
      "Format .doc lama belum didukung. Buka file di Microsoft Word lalu simpan sebagai .docx atau .txt."
    );
  }

  throw new Error(
    "Format belum didukung. Gunakan file .txt atau .docx."
  );
}

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

function openStory(story) {
  if (!story) return;

  activeStoryId = story.id;

  storyModalDate.textContent =
    `${story.extension.toUpperCase()} · DITAMBAHKAN ${formatStoryDate(story.createdAt)}`;

  storyModalTitle.textContent = story.title;
  storyReader.textContent = story.content;

  storyModal.showModal();
}

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

storyDownloadButton.addEventListener("click", () => {
  const story = savedStories.find(
    (item) => item.id === activeStoryId
  );

  downloadStory(story);
});

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

storyModalClose.addEventListener("click", () => {
  storyModal.close();
});

storyModal.addEventListener("click", (event) => {
  if (event.target === storyModal) {
    storyModal.close();
  }
});

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

initializeStories();

/* ==========================================================
   AKHIR SCRIPT — A2 KENANGAN BERSAMA SELAMANYA
   ANDINATA ANINDITA
   ========================================================== */

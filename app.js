/* ===== Penyimpanan (localStorage) ===== */
const STORAGE = {
  plants: "apt_plants_v1",
  careTypes: "apt_care_types_v1",
  activities: "apt_activities_v1"
};

const starterPlants = [
  { id: 1, name: "Monstera", type: "Hias", date: "2025-10-01", location: "Ruang Tamu", condition: "Baik" },
  { id: 2, name: "Lidah Mertua", type: "Hias", date: "2025-09-18", location: "Teras", condition: "Baik" },
  { id: 3, name: "Mawar", type: "Bunga", date: "2025-08-12", location: "Taman Belakang", condition: "Sedang" }
];
const starterCareTypes = ["Siram", "Pupuk", "Pemangkasan", "Ganti Media Tanam"];
const starterActivities = [
  { id: 1, date: "2025-10-15", plantId: 1, plantName: "Monstera", care: "Siram", note: "Daun mulai segar" },
  { id: 2, date: "2025-10-13", plantId: 2, plantName: "Lidah Mertua", care: "Pupuk", note: "Pupuk NPK" },
  { id: 3, date: "2025-10-10", plantId: 3, plantName: "Mawar", care: "Siram", note: "Tanah agak kering" },
  { id: 4, date: "2025-10-08", plantId: 1, plantName: "Monstera", care: "Pemangkasan", note: "Memotong daun kering" }
];

function readData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) { return fallback; }
}
function saveData(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* abaikan */ }
}
const getPlants = () => readData(STORAGE.plants, starterPlants);
const getCareTypes = () => readData(STORAGE.careTypes, starterCareTypes);
const getActivities = () => readData(STORAGE.activities, starterActivities);

/* ===== Helper ===== */
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}
// tanggal lokal (YYYY-MM-DD) tanpa bug zona waktu toISOString
function toLocalISO(d) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function todayISO() { return toLocalISO(new Date()); }
function formatDate(date) {
  if (!date) return "-";
  const d = new Date(date + "T00:00:00");
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function matches(text, term) { return text.toLowerCase().includes((term || "").toLowerCase()); }
function byDateDesc(a, b) { return b.date.localeCompare(a.date); }

function toastMessage(message) {
  let box = document.getElementById("appToast");
  if (!box) {
    box = document.createElement("div");
    box.id = "appToast";
    box.className = "toast-container position-fixed bottom-0 end-0 p-3";
    box.innerHTML = '<div class="toast text-bg-dark" role="status"><div class="d-flex"><div class="toast-body"></div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>';
    document.body.appendChild(box);
  }
  box.querySelector(".toast-body").textContent = message;
  if (window.bootstrap) bootstrap.Toast.getOrCreateInstance(box.querySelector(".toast"), { delay: 2500 }).show();
  else alert(message);
}

/* ===== Inisialisasi ===== */
let currentTerm = "";

// HTML tidak punya data-page, jadi halaman dikenali dari elemen khasnya
function detectPage() {
  if (document.getElementById("dashboardPlantCount")) return "dashboard";
  if (document.getElementById("plantForm")) return "master";
  if (document.getElementById("activityForm")) return "transaksi";
  if (document.getElementById("applyReport")) return "laporan";
  return "";
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector('form[role="search"]');
  const input = form ? form.querySelector("input") : null;
  markActiveMenu();
  if (form && input) {
    currentTerm = (new URLSearchParams(location.search).get("q") || "").trim();
    input.value = currentTerm;
    form.addEventListener("submit", e => {
      e.preventDefault();
      currentTerm = input.value.trim();
      renderCurrentPage();
    });
    input.addEventListener("input", () => {
      currentTerm = input.value.trim();
      renderCurrentPage();
    });
  }

  const page = detectPage();
  if (page === "dashboard") initDashboard();
  if (page === "master") initMaster();
  if (page === "transaksi") initTransactions();
  if (page === "laporan") initReports();
});

function renderCurrentPage() {
  const page = detectPage();
  if (page === "dashboard") renderDashboardActivities();
  if (page === "master") renderPlantTable();
  if (page === "transaksi") renderActivityTable();
  if (page === "laporan") renderReports();
}

/* ===== Dashboard ===== */
function initDashboard() {
  renderDashboardStats();
  renderDashboardActivities();
  document.getElementById("quickAddPlant")?.addEventListener("click", () => {
    location.href = "Data_master.html#form-tanaman";
  });
  document.getElementById("resetDemo")?.addEventListener("click", () => {
    if (!confirm("Kembalikan data contoh? Data yang sekarang akan diganti.")) return;
    saveData(STORAGE.plants, starterPlants);
    saveData(STORAGE.careTypes, starterCareTypes);
    saveData(STORAGE.activities, starterActivities);
    renderDashboardStats();
    renderDashboardActivities();
    toastMessage("Data contoh berhasil dipulihkan");
  });
}
function renderDashboardStats() {
  const total = document.getElementById("dashboardPlantCount");
  const care = document.getElementById("dashboardCareCount");
  if (total) total.textContent = getPlants().length;
  if (care) care.textContent = getActivities().length;
}
function renderDashboardActivities() {
  const target = document.getElementById("dashboardActivityList");
  if (!target) return;
  const list = getActivities().slice().sort(byDateDesc)
    .filter(a => matches(`${a.plantName} ${a.care} ${a.note} ${a.date}`, currentTerm));
  target.innerHTML = list.length
    ? list.slice(0, 6).map(a =>
        `<li><span>[${escapeHTML(a.care)} ${escapeHTML(a.plantName)}]</span><span class="small-muted">${formatDate(a.date)}</span></li>`).join("")
    : '<li class="text-secondary">Tidak ada aktivitas yang cocok.</li>';
}

/* ===== Data Master ===== */
function initMaster() {
  renderPlantTable();
  renderCareTypes();

  document.querySelectorAll(".category-card").forEach((card, i) =>
    card.addEventListener("click", () => {
      const toCare = i === 2;
      document.getElementById(toCare ? "careTypeForm" : "form-tanaman")?.scrollIntoView({ behavior: "smooth" });
      document.getElementById(toCare ? "newCareType" : "plantName")?.focus({ preventScroll: true });
    }));

  document.getElementById("plantForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const id = Number(document.getElementById("plantId").value);
    const plant = {
      id: id || Date.now(),
      name: document.getElementById("plantName").value.trim(),
      type: document.getElementById("plantType").value.trim(),
      date: document.getElementById("plantDate").value,
      location: document.getElementById("plantLocation").value.trim(),
      condition: document.getElementById("plantCondition").value
    };
    if (!plant.name || !plant.type || !plant.location) return toastMessage("Nama, jenis, dan lokasi wajib diisi");

    const plants = getPlants();
    const index = plants.findIndex(p => Number(p.id) === id);
    if (index >= 0) plants[index] = plant; else plants.push(plant);
    saveData(STORAGE.plants, plants);

    // sinkronkan nama tanaman pada catatan perawatan jika diedit
    if (index >= 0) {
      const acts = getActivities().map(a => Number(a.plantId) === plant.id ? { ...a, plantName: plant.name } : a);
      saveData(STORAGE.activities, acts);
    }
    resetPlantForm();
    renderPlantTable();
    toastMessage(index >= 0 ? "Data tanaman diperbarui" : "Tanaman berhasil ditambahkan");
  });

  document.getElementById("cancelEdit")?.addEventListener("click", resetPlantForm);

  document.getElementById("careTypeForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const input = document.getElementById("newCareType");
    const value = input.value.trim();
    if (!value) return;
    const types = getCareTypes();
    if (types.some(t => t.toLowerCase() === value.toLowerCase())) return toastMessage("Jenis perawatan sudah ada");
    types.push(value);
    saveData(STORAGE.careTypes, types);
    input.value = "";
    renderCareTypes();
    toastMessage("Jenis perawatan ditambahkan");
  });
}
function resetPlantForm() {
  document.getElementById("plantForm")?.reset();
  const id = document.getElementById("plantId");
  if (id) id.value = "";
  const title = document.getElementById("plantFormTitle");
  if (title) title.textContent = "Tambah Tanaman";
}
function renderPlantTable() {
  const target = document.getElementById("plantTableBody");
  if (!target) return;
  const plants = getPlants().filter(p => matches(`${p.name} ${p.type} ${p.location} ${p.condition}`, currentTerm));
  target.innerHTML = plants.length
    ? plants.map((p, i) => `
      <tr>
        <td>${i + 1}</td><td>${escapeHTML(p.name)}</td><td>${escapeHTML(p.type)}</td>
        <td>${formatDate(p.date)}</td><td>${escapeHTML(p.location)}</td><td>${escapeHTML(p.condition)}</td>
        <td class="text-nowrap">
          <button class="btn btn-outline-primary btn-icon me-1" data-edit-plant="${p.id}" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn btn-outline-danger btn-icon" data-delete-plant="${p.id}" title="Hapus"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join("")
    : '<tr><td colspan="7" class="text-center text-secondary py-4">Belum ada data tanaman.</td></tr>';

  target.querySelectorAll("[data-edit-plant]").forEach(btn => btn.addEventListener("click", () => {
    const p = getPlants().find(x => Number(x.id) === Number(btn.dataset.editPlant));
    if (!p) return;
    document.getElementById("plantId").value = p.id;
    document.getElementById("plantName").value = p.name;
    setSelectValue(document.getElementById("plantType"), p.type);
    document.getElementById("plantDate").value = p.date;
    setSelectValue(document.getElementById("plantLocation"), p.location);
    document.getElementById("plantCondition").value = p.condition;
    document.getElementById("plantFormTitle").textContent = "Edit Tanaman";
    document.getElementById("form-tanaman").scrollIntoView({ behavior: "smooth" });
  }));

  target.querySelectorAll("[data-delete-plant]").forEach(btn => btn.addEventListener("click", () => {
    const p = getPlants().find(x => Number(x.id) === Number(btn.dataset.deletePlant));
    if (!p || !confirm(`Hapus tanaman "${p.name}"?`)) return;
    saveData(STORAGE.plants, getPlants().filter(x => Number(x.id) !== Number(p.id)));
    renderPlantTable();
    toastMessage("Tanaman dihapus");
  }));
}
function renderCareTypes() {
  const target = document.getElementById("careTypeList");
  if (!target) return;
  target.innerHTML = getCareTypes().map((t, i) =>
    `<li class="list-group-item d-flex justify-content-between align-items-center">${escapeHTML(t)}
      <button class="btn btn-sm btn-outline-danger" data-delete-care="${i}">Hapus</button></li>`).join("");
  target.querySelectorAll("[data-delete-care]").forEach(btn => btn.addEventListener("click", () => {
    const types = getCareTypes();
    const index = Number(btn.dataset.deleteCare);
    if (!confirm(`Hapus jenis perawatan "${types[index]}"?`)) return;
    types.splice(index, 1);
    saveData(STORAGE.careTypes, types);
    renderCareTypes();
    toastMessage("Jenis perawatan dihapus");
  }));
}

/* ===== Transaksi ===== */
function initTransactions() {
  populateTransactionOptions();
  const note = document.getElementById("activityNote");
  if (note) note.value = "";
  renderActivityTable();
  document.getElementById("activityForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const plantId = Number(document.getElementById("activityPlant").value);
    const plant = getPlants().find(p => Number(p.id) === plantId);
    if (!plant) return toastMessage("Pilih tanaman terlebih dahulu");
    const care = document.getElementById("activityCare").value;
    if (!care) return toastMessage("Pilih jenis perawatan terlebih dahulu");

    const activities = getActivities();
    activities.push({
      id: Date.now(),
      date: document.getElementById("activityDate").value,
      plantId,
      plantName: plant.name,
      care,
      note: document.getElementById("activityNote").value.trim()
    });
    saveData(STORAGE.activities, activities);
    e.target.reset();
    document.getElementById("activityDate").value = todayISO();
    renderActivityTable();
    toastMessage("Catatan perawatan disimpan");
  });
}
function populateTransactionOptions() {
  const plantSelect = document.getElementById("activityPlant");
  const careSelect = document.getElementById("activityCare");
  if (plantSelect) plantSelect.innerHTML = '<option value="">Pilih tanaman</option>' +
    getPlants().map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join("");
  if (careSelect) careSelect.innerHTML = '<option value="">Pilih jenis perawatan</option>' +
    getCareTypes().map(t => `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join("");
  const date = document.getElementById("activityDate");
  if (date && !date.value) date.value = todayISO();
}
function renderActivityTable() {
  const target = document.getElementById("activityTableBody");
  if (!target) return;
  const list = getActivities().slice().sort(byDateDesc)
    .filter(a => matches(`${a.plantName} ${a.care} ${a.note} ${a.date}`, currentTerm));
  target.innerHTML = list.length
    ? list.map((a, i) => `
      <tr>
        <td>${i + 1}</td><td>${formatDate(a.date)}</td><td>${escapeHTML(a.plantName)}</td>
        <td>${escapeHTML(a.care)}</td><td>${escapeHTML(a.note)}</td>
        <td><button class="btn btn-sm btn-outline-danger" data-delete-activity="${a.id}"><i class="fas fa-trash me-1"></i>Hapus</button></td>
      </tr>`).join("")
    : '<tr><td colspan="6" class="text-center text-secondary py-4">Belum ada aktivitas perawatan.</td></tr>';

  target.querySelectorAll("[data-delete-activity]").forEach(btn => btn.addEventListener("click", () => {
    if (!confirm("Hapus catatan perawatan ini?")) return;
    saveData(STORAGE.activities, getActivities().filter(a => String(a.id) !== btn.dataset.deleteActivity));
    renderActivityTable();
    toastMessage("Catatan perawatan dihapus");
  }));
}

/* ===== Laporan ===== */
function initReports() {
  const start = document.getElementById("reportStart");
  const end = document.getElementById("reportEnd");
  const type = document.getElementById("reportType");

  // isi pilihan jenis laporan dari daftar jenis perawatan
  if (type) type.innerHTML = '<option value="Semua">Semua</option>' +
    getCareTypes().map(t => `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join("");

  // periode awal: tanggal catatan paling lama (atau 1 Jan tahun ini), akhir: hari ini
  const dates = getActivities().map(a => a.date).filter(Boolean).sort();
  if (start) start.value = dates[0] || `${new Date().getFullYear()}-01-01`;
  if (end) end.value = todayISO();

  document.getElementById("applyReport")?.addEventListener("click", () => {
    if (start.value && end.value && start.value > end.value) {
      return toastMessage("Periode mulai tidak boleh melebihi periode akhir");
    }
    renderReports();
  });
  renderReports();
}
function getFilteredActivities() {
  const start = document.getElementById("reportStart")?.value || "";
  const end = document.getElementById("reportEnd")?.value || "";
  const type = document.getElementById("reportType")?.value || "Semua";
  return getActivities().filter(a =>
    (!start || a.date >= start) &&
    (!end || a.date <= end) &&
    (type === "Semua" || a.care === type) &&
    matches(`${a.plantName} ${a.care} ${a.note} ${a.date}`, currentTerm));
}
function renderReports() {
  const list = getFilteredActivities();
  document.getElementById("reportPlantCount").textContent = getPlants().length;
  document.getElementById("reportCareCount").textContent = list.length;

  const counts = {};
  list.forEach(a => { counts[a.care] = (counts[a.care] || 0) + 1; });
  const chart = document.getElementById("reportBars");
  if (chart) {
    const max = Math.max(1, ...Object.values(counts));
    chart.innerHTML = Object.keys(counts).length
      ? Object.entries(counts).map(([name, count]) => `
        <div class="mb-2">
          <div class="d-flex justify-content-between"><span>${escapeHTML(name)}</span><span>${count}</span></div>
          <div class="progress" role="progressbar" aria-label="${escapeHTML(name)}">
            <div class="progress-bar bg-success" style="width:${(count / max) * 100}%"></div>
          </div>
        </div>`).join("")
      : '<span class="text-secondary">Tidak ada data pada periode ini.</span>';
  }
  renderReportTable(list);
}
function renderReportTable(list) {
  const target = document.getElementById("reportTableBody");
  if (!target) return;
  const rows = (list || getFilteredActivities()).slice().sort(byDateDesc);
  target.innerHTML = rows.length
    ? rows.map((a, i) => `<tr><td>${i + 1}</td><td>${formatDate(a.date)}</td><td>${escapeHTML(a.plantName)}</td><td>${escapeHTML(a.care)}</td><td>${escapeHTML(a.note)}</td></tr>`).join("")
    : '<tr><td colspan="5" class="text-center text-secondary py-4">Tidak ada data laporan.</td></tr>';
}

/* ===== Helper tambahan ===== */
function setSelectValue(select, value) {
  if (!select) return;
  if (value && ![...select.options].some(o => o.value === value)) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  }
  select.value = value;
}
function markActiveMenu() {
  const file = location.pathname.split("/").pop();
  const links = document.querySelectorAll(".sidebar .nav-link");
  let found = false;
  links.forEach(a => {
    const same = file && a.getAttribute("href") === file;
    a.classList.toggle("active", same);
    if (same) found = true;
  });
  if (!found && links[0]) links[0].classList.add("active"); // Dashboard
}

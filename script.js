const noticeList = document.getElementById("noticeList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const activeOnly = document.getElementById("activeOnly");
const dialog = document.getElementById("noticeDialog");
const form = document.getElementById("noticeForm");
const toast = document.getElementById("toast");

let editingId = null;
let searchTimer = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Something went wrong.");
  return result;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric"
  });
}

async function loadNotices() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
  if (categoryFilter.value) params.set("category", categoryFilter.value);
  if (activeOnly.checked) params.set("active", "true");

  try {
    const notices = await api(`/api/notices?${params.toString()}`);
    document.getElementById("resultCount").textContent =
      `${notices.length} notice${notices.length === 1 ? "" : "s"} found`;

    noticeList.innerHTML = notices.map(notice => `
      <article class="notice-card">
        <div class="card-top">
          <span class="category">${escapeHtml(notice.category)}</span>
          <span class="status ${notice.status}">${escapeHtml(notice.status)}</span>
        </div>
        <h3>${escapeHtml(notice.title)}</h3>
        <p class="notice-date">Published: ${formatDate(notice.notice_date)}</p>
        <div class="card-actions">
          <button class="action-button" data-action="edit" data-id="${notice.id}">Edit</button>
          ${notice.status === "active"
            ? `<button class="action-button" data-action="expired" data-id="${notice.id}">Mark expired</button>`
            : `<button class="action-button" data-action="active" data-id="${notice.id}">Reactivate</button>`}
          ${notice.status === "archived"
            ? `<button class="action-button" data-action="active" data-id="${notice.id}">Unarchive</button>`
            : `<button class="action-button" data-action="archived" data-id="${notice.id}">Archive</button>`}
          <button class="action-button danger" data-action="delete" data-id="${notice.id}">Delete</button>
        </div>
      </article>
    `).join("");

    emptyState.hidden = notices.length !== 0;
    noticeList.hidden = notices.length === 0;
  } catch (error) {
    showToast(error.message);
  }
}

function openAddDialog() {
  editingId = null;
  form.reset();
  document.getElementById("dialogTitle").textContent = "Add notice";
  document.getElementById("saveButton").textContent = "Save notice";
  document.getElementById("dateInput").value = new Date().toISOString().slice(0, 10);
  document.getElementById("formError").textContent = "";
  dialog.showModal();
}

async function openEditDialog(id) {
  try {
    const notices = await api("/api/notices");
    const notice = notices.find(item => item.id === id);
    if (!notice) throw new Error("Notice not found.");
    editingId = id;
    document.getElementById("titleInput").value = notice.title;
    document.getElementById("categoryInput").value = notice.category;
    document.getElementById("dateInput").value = notice.notice_date;
    document.getElementById("dialogTitle").textContent = "Edit notice";
    document.getElementById("saveButton").textContent = "Update notice";
    document.getElementById("formError").textContent = "";
    dialog.showModal();
  } catch (error) {
    showToast(error.message);
  }
}

document.getElementById("addButton").addEventListener("click", openAddDialog);
document.getElementById("emptyAddButton").addEventListener("click", openAddDialog);
document.getElementById("closeDialog").addEventListener("click", () => dialog.close());
document.getElementById("cancelButton").addEventListener("click", () => dialog.close());

form.addEventListener("submit", async event => {
  event.preventDefault();
  const payload = {
    title: document.getElementById("titleInput").value.trim(),
    category: document.getElementById("categoryInput").value,
    date: document.getElementById("dateInput").value
  };
  try {
    await api(editingId ? `/api/notices/${editingId}` : "/api/notices", {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    dialog.close();
    showToast(editingId ? "Notice updated." : "Notice added.");
    await loadNotices();
  } catch (error) {
    document.getElementById("formError").textContent = error.message;
  }
});

noticeList.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "edit") return openEditDialog(id);
  if (action === "delete") {
    if (!confirm("Permanently delete this notice?")) return;
    try {
      await api(`/api/notices/${id}`, { method: "DELETE" });
      showToast("Notice deleted.");
      await loadNotices();
    } catch (error) { showToast(error.message); }
    return;
  }

  const status = action;
  try {
    await api(`/api/notices/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    showToast(`Notice marked ${status}.`);
    await loadNotices();
  } catch (error) { showToast(error.message); }
});

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadNotices, 250);
});
categoryFilter.addEventListener("change", loadNotices);
activeOnly.addEventListener("change", loadNotices);

loadNotices();

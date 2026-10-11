"use strict";

const contactsApi = "/api/contacts";
const groupsApi = "/api/groups";

function byId(id) {
  return document.getElementById(id);
}

const contactModal = new bootstrap.Modal(byId("contact-modal"));
const mailingModal = new bootstrap.Modal(byId("mailing-modal"));
const softGreen =
  "bg-success-subtle text-success-emphasis border border-success-subtle";

let groups = [];
let currentContacts = [];
let activeGroupId = "";

function showAlert(element, message, type = "danger") {
  element.textContent = message;
  element.className = "alert alert-" + type;
}

function hideAlert(element) {
  element.textContent = "";
  element.className = "alert d-none";
}

async function requestJson(url, options = {}) {
  if (options.body) {
    options.headers = { "Content-Type": "application/json" };
  }
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Помилка " + response.status);
  }
  return result;
}

function makeIconButton(icon, colorClasses, title, action, id) {
  return (
    '<button type="button" class="btn ' +
    colorClasses +
    ' d-inline-flex align-items-center justify-content-center p-0"' +
    ' style="width: 40px; height: 40px"' +
    ' title="' +
    title +
    ' контакт"' +
    ' data-action="' +
    action +
    '" data-id="' +
    id +
    '">' +
    icon +
    "</button>"
  );
}

function addCell(row, text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  row.appendChild(cell);
}

function addCheckbox(container, className, value, labelText, checked = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "form-check";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "form-check-input " + className;
  checkbox.id = className + "-" + value;
  checkbox.value = value;
  checkbox.checked = checked;
  const label = document.createElement("label");
  label.className = "form-check-label";
  label.htmlFor = checkbox.id;
  label.textContent = labelText;
  wrapper.append(checkbox, label);
  container.appendChild(wrapper);
}

function getCheckedValues(className) {
  const checked = document.querySelectorAll("." + className + ":checked");
  return Array.from(checked).map((checkbox) => checkbox.value);
}

function renderGroupCheckboxes(container, className, selectedIds = []) {
  container.innerHTML = "";
  if (groups.length === 0) {
    container.textContent = "Груп ще немає";
  }
  for (const group of groups) {
    addCheckbox(
      container,
      className,
      group._id,
      group.name,
      selectedIds.includes(group._id),
    );
  }
}

function renderGroupFilter() {
  const menu = byId("group-filter-menu");
  menu.innerHTML = "";
  const items = [{ _id: "", name: "Усі контакти" }].concat(groups);
  for (const item of items) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dropdown-item";
    button.dataset.groupFilter = item._id;
    button.textContent = item.name;
    li.appendChild(button);
    menu.appendChild(li);
  }
  const activeGroup = groups.find((group) => group._id === activeGroupId);
  if (!activeGroup) {
    activeGroupId = "";
  }
  byId("group-filter-button").textContent =
    "Фільтр: " + (activeGroup ? activeGroup.name : "усі контакти");
}

function renderGroupManager() {
  const container = byId("group-list");
  container.innerHTML = "";
  byId("no-groups-message").classList.toggle("d-none", groups.length > 0);
  for (const group of groups) {
    const form = document.createElement("form");
    form.className = "list-group-item d-flex gap-2";
    form.dataset.groupId = group._id;
    form.innerHTML =
      '<input class="form-control" maxlength="60" required aria-label="Назва групи">' +
      '<button type="submit" class="btn btn-outline-success">Зберегти</button>' +
      '<button type="button" class="btn btn-outline-danger" data-delete-group="' +
      group._id +
      '">Видалити</button>';
    form.querySelector("input").value = group.name;
    container.appendChild(form);
  }
}

async function loadGroups() {
  try {
    groups = await requestJson(groupsApi);
    renderGroupFilter();
    renderGroupManager();
  } catch (error) {
    showAlert(
      byId("page-message"),
      "Не вдалося завантажити групи: " + error.message,
    );
  }
}

byId("group-filter-menu").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-group-filter]");
  if (!button) {
    return;
  }
  activeGroupId = button.dataset.groupFilter;
  renderGroupFilter();
  await loadContacts();
});

byId("group-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideAlert(byId("group-form-error"));
  const input = byId("new-group-name");
  try {
    await requestJson(groupsApi, {
      method: "POST",
      body: JSON.stringify({ name: input.value.trim() }),
    });
    input.value = "";
    await loadGroups();
  } catch (error) {
    showAlert(
      byId("group-form-error"),
      "Не вдалося створити групу: " + error.message,
    );
  }
});

byId("group-list").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideAlert(byId("group-list-error"));
  const form = event.target;
  const name = form.querySelector("input").value.trim();
  try {
    await requestJson(groupsApi + "/" + form.dataset.groupId, {
      method: "PUT",
      body: JSON.stringify({ name: name }),
    });
    await loadGroups();
    await loadContacts();
  } catch (error) {
    showAlert(
      byId("group-list-error"),
      "Не вдалося змінити групу: " + error.message,
    );
  }
});

byId("group-list").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-delete-group]");
  if (!button) {
    return;
  }
  if (
    !confirm(
      "Видалити групу? Контакти залишаться, але будуть від'єднані від неї.",
    )
  ) {
    return;
  }
  hideAlert(byId("group-list-error"));
  try {
    await requestJson(groupsApi + "/" + button.dataset.deleteGroup, {
      method: "DELETE",
    });
    await loadGroups();
    await loadContacts();
  } catch (error) {
    showAlert(
      byId("group-list-error"),
      "Не вдалося видалити групу: " + error.message,
    );
  }
});

function renderContacts(contacts) {
  const tableBody = byId("table-body");
  tableBody.innerHTML = "";
  currentContacts = contacts;
  if (contacts.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="7" class="text-center text-body-secondary py-4">' +
      "Контактів у цьому списку немає.</td></tr>";
    return;
  }
  for (const contact of contacts) {
    const groupNames = contact.groupIds.map((group) => group.name).join(", ");
    const row = document.createElement("tr");
    addCell(row, contact.lastName);
    addCell(row, contact.firstName);
    addCell(row, contact.middleName);
    addCell(row, contact.email);
    addCell(row, groupNames || "—");
    addCell(row, contact.consentToMailing ? "Так" : "Ні");
    const actionsCell = document.createElement("td");
    actionsCell.className = "text-center";
    actionsCell.innerHTML =
      '<div class="d-flex justify-content-center gap-2">' +
      makeIconButton("✎", softGreen, "Редагувати", "edit", contact._id) +
      makeIconButton("X", "btn-danger", "Видалити", "delete", contact._id) +
      "</div>";
    row.appendChild(actionsCell);
    tableBody.appendChild(row);
  }
}

async function loadContacts() {
  const pageMessage = byId("page-message");
  hideAlert(pageMessage);
  try {
    let url = contactsApi;
    if (activeGroupId) {
      url += "?groupId=" + encodeURIComponent(activeGroupId);
    }
    renderContacts(await requestJson(url));
  } catch (error) {
    showAlert(pageMessage, "Не вдалося завантажити контакти: " + error.message);
    byId("table-body").innerHTML = "";
  }
}

function openContactForm(contact) {
  byId("contact-form").reset();
  hideAlert(byId("contact-form-error"));
  let selectedGroupIds = [];
  if (contact) {
    byId("contact-modal-title").textContent = "Редагувати контакт";
    byId("save-contact").textContent = "Зберегти зміни";
    byId("contact-id").value = contact._id;
    byId("lastName").value = contact.lastName;
    byId("firstName").value = contact.firstName;
    byId("middleName").value = contact.middleName;
    byId("email").value = contact.email;
    byId("consentToMailing").checked = contact.consentToMailing;
    selectedGroupIds = contact.groupIds.map((group) => group._id);
  } else {
    byId("contact-modal-title").textContent = "Додати контакт";
    byId("save-contact").textContent = "Зберегти контакт";
    byId("contact-id").value = "";
  }
  renderGroupCheckboxes(
    byId("contact-group-options"),
    "contact-group-checkbox",
    selectedGroupIds,
  );
  contactModal.show();
}

byId("add-contact").addEventListener("click", () => openContactForm(null));

byId("contact-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = byId("contact-id").value;
  const contact = {
    lastName: byId("lastName").value.trim(),
    firstName: byId("firstName").value.trim(),
    middleName: byId("middleName").value.trim(),
    email: byId("email").value.trim(),
    consentToMailing: byId("consentToMailing").checked,
    groupIds: getCheckedValues("contact-group-checkbox"),
  };
  const saveButton = byId("save-contact");
  saveButton.disabled = true;
  hideAlert(byId("contact-form-error"));
  try {
    await requestJson(id ? contactsApi + "/" + id : contactsApi, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(contact),
    });
    contactModal.hide();
    await loadContacts();
    showAlert(
      byId("page-message"),
      id ? "Контакт оновлено." : "Контакт додано.",
      "success",
    );
  } catch (error) {
    showAlert(
      byId("contact-form-error"),
      "Не вдалося зберегти контакт: " + error.message,
    );
  } finally {
    saveButton.disabled = false;
  }
});

byId("table-body").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const contact = currentContacts.find(
    (item) => item._id === button.dataset.id,
  );
  if (button.dataset.action === "edit") {
    openContactForm(contact);
  } else {
    await deleteContact(contact);
  }
});

async function deleteContact(contact) {
  const name =
    contact.lastName + " " + contact.firstName + " (" + contact.email + ")";
  if (!confirm("Перемістити контакт " + name + " до кошика?")) {
    return;
  }
  try {
    await requestJson(contactsApi + "/" + contact._id, { method: "DELETE" });
    await loadContacts();
    showAlert(byId("page-message"), "Контакт переміщено до кошика.", "success");
  } catch (error) {
    showAlert(
      byId("page-message"),
      "Не вдалося видалити контакт: " + error.message,
    );
  }
}

async function loadTrash() {
  hideAlert(byId("trash-error"));
  try {
    const trashContacts = await requestJson(contactsApi + "/trash");
    const tableBody = byId("trash-table-body");
    tableBody.innerHTML = "";
    byId("trash-empty-message").classList.toggle(
      "d-none",
      trashContacts.length > 0,
    );
    byId("empty-trash").disabled = trashContacts.length === 0;
    for (const contact of trashContacts) {
      const row = document.createElement("tr");
      addCell(
        row,
        contact.lastName + " " + contact.firstName + " " + contact.middleName,
      );
      addCell(row, contact.email);
      const actionCell = document.createElement("td");
      actionCell.className = "text-end";
      actionCell.innerHTML =
        '<button class="btn ' +
        softGreen +
        '" data-restore-id="' +
        contact._id +
        '">Відновити</button>';
      row.appendChild(actionCell);
      tableBody.appendChild(row);
    }
  } catch (error) {
    showAlert(
      byId("trash-error"),
      "Не вдалося завантажити кошик: " + error.message,
    );
  }
}

byId("trash-modal").addEventListener("shown.bs.modal", loadTrash);

byId("trash-table-body").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-restore-id]");
  if (!button) {
    return;
  }
  try {
    await requestJson(
      contactsApi + "/trash/" + button.dataset.restoreId + "/restore",
      { method: "POST" },
    );
    await loadTrash();
    await loadContacts();
    showAlert(byId("page-message"), "Контакт відновлено.", "success");
  } catch (error) {
    showAlert(
      byId("trash-error"),
      "Не вдалося відновити контакт: " + error.message,
    );
  }
});

byId("empty-trash").addEventListener("click", async () => {
  if (
    !confirm(
      "Остаточно видалити всі контакти з кошика? Відновити їх буде неможливо.",
    )
  ) {
    return;
  }
  try {
    await requestJson(contactsApi + "/trash", { method: "DELETE" });
    await loadTrash();
    showAlert(byId("page-message"), "Кошик очищено остаточно.", "success");
  } catch (error) {
    showAlert(
      byId("trash-error"),
      "Не вдалося очистити кошик: " + error.message,
    );
  }
});

const presetTemplates = {
  "preset-greeting": {
    name: "Привітання",
    subject: "Вітаємо вас!",
    message:
      "Доброго дня!\n\nВітаємо вас у нашому списку розсилки. Дякуємо, що ви з нами.\n\nЗ повагою, команда",
  },
  "preset-invitation": {
    name: "Запрошення на захід",
    subject: "Запрошення на захід",
    message:
      "Доброго дня!\n\nЗапрошуємо вас на наш захід. Деталі про час і місце надішлемо окремим листом.\n\nЧекаємо на вас!",
  },
  "preset-reminder": {
    name: "Нагадування",
    subject: "Нагадування",
    message:
      "Доброго дня!\n\nНагадуємо вам про заплановану подію. Якщо плани змінились, будь ласка, повідомте нас.\n\nДякуємо!",
  },
};

const storageKey = "mailingTemplatesV2";

function loadSavedTemplates() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch (error) {
    return {};
  }
}
let savedTemplates = loadSavedTemplates();

function saveTemplates() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(savedTemplates));
  } catch (error) {
    alert("Не вдалося зберегти шаблон у браузері.");
  }
}

const templateSelect = byId("template");

function addTemplateOption(id, name) {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = name;
  templateSelect.appendChild(option);
}

function renderTemplateOptions() {
  templateSelect.innerHTML = "";
  addTemplateOption("custom", "Власний текст");
  for (const id in presetTemplates) {
    addTemplateOption(id, presetTemplates[id].name);
  }
  const savedIds = Object.keys(savedTemplates).sort((a, b) =>
    savedTemplates[a].name.localeCompare(savedTemplates[b].name, "uk"),
  );
  for (const id of savedIds) {
    addTemplateOption(id, savedTemplates[id].name);
  }
}

function updateTemplateButtons() {
  const isSaved = Boolean(savedTemplates[templateSelect.value]);

  byId("create-template").classList.toggle("d-none", isSaved);
  byId("update-template").classList.toggle("d-none", !isSaved);
  byId("delete-template").classList.toggle("d-none", !isSaved);
}

templateSelect.addEventListener("change", () => {
  const id = templateSelect.value;
  const template = presetTemplates[id] || savedTemplates[id];
  if (template) {
    byId("subject").value = template.subject;
    byId("message").value = template.message;
  }
  updateTemplateButtons();
});

byId("create-template").addEventListener("click", () => {
  const subject = byId("subject").value.trim();
  const message = byId("message").value.trim();

  if (!subject || !message) {
    alert("Спочатку введи тему та текст повідомлення.");
    return;
  }
  const name = prompt("Введи назву нового шаблону:");
  if (!name || !name.trim()) {
    return;
  }
  const id = "template-" + Date.now();
  savedTemplates[id] = {
    name: name.trim(),
    subject: subject,
    message: message,
  };
  saveTemplates();
  renderTemplateOptions();
  templateSelect.value = id;
  updateTemplateButtons();
});

byId("update-template").addEventListener("click", () => {
  const id = templateSelect.value;
  const subject = byId("subject").value.trim();
  const message = byId("message").value.trim();
  if (!subject || !message) {
    alert("Тема та текст повідомлення не можуть бути порожніми.");
    return;
  }
  const newName = prompt("Назва шаблону:", savedTemplates[id].name);
  if (!newName || !newName.trim()) {
    return;
  }
  savedTemplates[id] = {
    name: newName.trim(),
    subject: subject,
    message: message,
  };
  saveTemplates();
  renderTemplateOptions();
  templateSelect.value = id;
  updateTemplateButtons();
});

byId("delete-template").addEventListener("click", () => {
  const id = templateSelect.value;
  if (!confirm("Видалити шаблон «" + savedTemplates[id].name + "»?")) {
    return;
  }
  delete savedTemplates[id];
  saveTemplates();
  renderTemplateOptions();
  templateSelect.value = "custom";
  updateTemplateButtons();
});

async function loadMailingContacts() {
  const container = byId("mailing-contact-options");
  container.innerHTML = "";
  hideAlert(byId("mailing-options-error"));
  try {
    const contacts = await requestJson(contactsApi);
    const consented = contacts.filter((contact) => contact.consentToMailing);
    if (consented.length === 0) {
      container.textContent = "Немає активних контактів зі згодою на розсилку.";
    }
    for (const contact of consented) {
      const text =
        contact.lastName + " " + contact.firstName + " - " + contact.email;
      addCheckbox(container, "mailing-contact-checkbox", contact._id, text);
    }
  } catch (error) {
    showAlert(
      byId("mailing-options-error"),
      "Не вдалося завантажити контакти: " + error.message,
    );
  }
}

byId("mailing-modal").addEventListener("shown.bs.modal", () => {
  renderGroupCheckboxes(
    byId("mailing-group-options"),
    "mailing-group-checkbox",
  );
  loadMailingContacts();
});

byId("send-mailing").addEventListener("click", async () => {
  const errorBox = byId("mailing-options-error");
  hideAlert(errorBox);
  const groupIds = getCheckedValues("mailing-group-checkbox");
  const contactIds = getCheckedValues("mailing-contact-checkbox");
  const subject = byId("subject").value.trim();
  const message = byId("message").value.trim();
  if (groupIds.length === 0 && contactIds.length === 0) {
    showAlert(errorBox, "Вибери хоча б одну групу або окремий контакт.");
    return;
  }
  if (!subject || !message) {
    showAlert(errorBox, "Заповни тему та текст повідомлення.");
    return;
  }
  const question =
    "Вибрано груп: " +
    groupIds.length +
    "; окремих контактів: " +
    contactIds.length +
    ".\nАдреси без згоди на розсилку будуть пропущені.\n\nНадіслати розсилку?";
  if (!confirm(question)) {
    return;
  }
  const sendButton = byId("send-mailing");
  sendButton.disabled = true;
  try {
    const result = await requestJson("/api/mailing/send", {
      method: "POST",
      body: JSON.stringify({
        groupIds: groupIds,
        contactIds: contactIds,
        subject: subject,
        message: message,
      }),
    });
    mailingModal.hide();
    showAlert(
      byId("page-message"),
      "Розсилку надіслано: " + result.sentCount + " лист(ів).",
      "success",
    );
  } catch (error) {
    showAlert(errorBox, "Не вдалося надіслати: " + error.message);
  } finally {
    sendButton.disabled = false;
  }
});

async function startApp() {
  renderTemplateOptions();
  updateTemplateButtons();
  await loadGroups();
  await loadContacts();
}

startApp();

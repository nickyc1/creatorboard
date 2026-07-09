const emailForm = document.getElementById("emailForm");
const codeForm = document.getElementById("codeForm");
const emailInput = document.getElementById("emailInput");
const codeInput = document.getElementById("codeInput");
const changeEmailButton = document.getElementById("changeEmailButton");
const loginMessage = document.getElementById("loginMessage");

let pendingEmail = "";

checkSession();

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  pendingEmail = emailInput.value.trim().toLowerCase();
  loginMessage.textContent = "Sending code...";
  setDisabled(emailForm, true);
  try {
    const data = await postJson("/api/auth/request-code", { email: pendingEmail });
    emailForm.hidden = true;
    codeForm.hidden = false;
    codeInput.focus();
    loginMessage.textContent = data.devCode
      ? `Development code: ${data.devCode}`
      : data.message || "Check your email for a six-digit code.";
  } catch (error) {
    loginMessage.textContent = error.message;
  } finally {
    setDisabled(emailForm, false);
  }
});

codeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "Checking code...";
  setDisabled(codeForm, true);
  try {
    await postJson("/api/auth/verify-code", {
      email: pendingEmail,
      code: codeInput.value.trim(),
    });
    location.href = "/app.html";
  } catch (error) {
    loginMessage.textContent = error.message;
  } finally {
    setDisabled(codeForm, false);
  }
});

changeEmailButton.addEventListener("click", () => {
  pendingEmail = "";
  codeInput.value = "";
  codeForm.hidden = true;
  emailForm.hidden = false;
  loginMessage.textContent = "";
  emailInput.focus();
});

async function checkSession() {
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    const data = await response.json();
    if (data.authRequired && data.authenticated) location.href = "/app.html";
  } catch {}
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || "Request failed.");
  return data;
}

function setDisabled(form, disabled) {
  form.querySelectorAll("button, input").forEach((element) => {
    element.disabled = disabled;
  });
}

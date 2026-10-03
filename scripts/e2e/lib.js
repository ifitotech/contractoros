// Shared helpers for the local e2e flows (Playwright).
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")); }
exports.BASE = (process.env.BASE_URL || "http://localhost:3100").replace(/\/$/, "");
exports.PASSWORD = "Smoke-test-123";
const RUN = Date.now().toString(36);
exports.RUN = RUN;
let failed = 0;
exports.ok = (name, cond, extra) => { console.log((cond ? "PASS " : "FAIL ") + name + (!cond && extra ? "  -> " + extra : "")); if (!cond) failed++; };
exports.failures = () => failed;
exports.launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
exports.page = async (browser, w = 1280, h = 900, locale = "es-ES") => (await browser.newContext({ viewport: { width: w, height: h }, locale })).newPage();
const B = exports.BASE;

exports.register = async (page, name, email, company) => {
  await page.goto(B + "/register");
  await page.getByRole("textbox").nth(0).fill(name);
  await page.getByRole("textbox").nth(1).fill(email);
  await page.locator("input[type=password]").fill(exports.PASSWORD);
  await page.getByRole("button", { name: /Continuar|Continue/ }).click();
  await page.locator("input[name=companyNameField]").fill(company);
  await page.getByRole("button", { name: /Crear empresa|Create free company/ }).click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
};

exports.createProject = async (page, name, client) => {
  await page.goto(B + "/projects/new");
  await page.locator("input[name=name]").fill(name);
  if (await page.locator("select[name=clientId]").count()) await page.locator("select[name=clientId]").selectOption("new");
  await page.locator("input[name=newClientName]").fill(client);
  await page.locator("input[name=address]").fill("123 Ocean Dr, Miami");
  await page.getByRole("button", { name: /Crear proyecto|Create project/ }).click();
  await page.waitForURL(/projects\/[0-9a-f-]{36}$/, { timeout: 30000 });
  return page.url().split("/").pop();
};

/** Owner invites an employee (template) and returns a logged-in page for that employee, assigned to the project. */
exports.inviteEmployee = async (browser, owner, name, email, template, projectId) => {
  await owner.goto(B + "/employees/invite");
  await owner.locator("input[name=fullName]").fill(name);
  await owner.locator("input[name=email]").fill(email);
  await owner.locator("select[name=template]").selectOption(template);
  await owner.getByRole("button", { name: /Invitar empleado|Invite employee/ }).click();
  const box = owner.locator("p.break-all");
  await box.waitFor({ timeout: 30000 });
  const link = (await box.innerText()).trim();
  const emp = await exports.page(browser, 390, 844);
  await emp.goto(link);
  await emp.getByRole("link", { name: /Crear mi cuenta|Create my account/ }).click();
  await emp.locator("input[type=email]").waitFor();
  await emp.waitForTimeout(1200);
  await emp.getByRole("textbox").nth(0).fill(name);
  await emp.locator("input[type=password]").fill(exports.PASSWORD);
  await emp.getByRole("button", { name: /Crear mi cuenta|Create my account/ }).click();
  await emp.waitForURL("**/dashboard", { timeout: 30000 });
  if (projectId) {
    await owner.goto(B + "/employees");
    await owner.getByText(name).first().click();
    await owner.waitForURL(/employees\/[0-9a-f-]{36}/);
    const boxes = owner.locator("section", { hasText: /Proyectos asignados|Assigned projects/ }).locator("input[type=checkbox]");
    await boxes.nth(0).check();
    await owner.waitForTimeout(1500);
  }
  return emp;
};

/** A material list from pasted lines ("20 x EMT" per line). Returns the list URL. */
exports.createList = async (page, projectId, pasted, count) => {
  await page.goto(`${B}/projects/${projectId}/materials/new`);
  await page.getByRole("button", { name: /Pegar lista|Paste list/ }).click();
  await page.locator("textarea").first().fill(pasted);
  await page.getByRole("button", { name: new RegExp(`Agregar ${count} líneas|Add ${count} lines`) }).click();
  await page.getByRole("button", { name: /Enviar pedido|Send request/ }).click();
  await page.waitForURL(/materials\/[0-9a-f-]{36}$/, { timeout: 30000 });
  return page.url();
};

/** Buy now from a one-line list: the only way to make a purchase order. Resolves when the PO page opens, or returns false if refused. */
exports.buyOne = async (page, projectId, vendor, amount) => {
  await exports.createList(page, projectId, `1 x ${vendor} item`, 1).catch(async () => {
    await page.goto(`${B}/projects/${projectId}/materials/new`);
    await page.getByPlaceholder(/Busca un ítem|Search an item/).fill(`${vendor} item x 1`);
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /Enviar pedido|Send request/ }).click();
    await page.waitForURL(/materials\/[0-9a-f-]{36}$/, { timeout: 30000 });
  });
  await page.getByRole("button", { name: /Comprar ya|Buy now/ }).click();
  const sel = page.locator("select").filter({ has: page.locator("option", { hasText: /Otro|Other/ }) });
  if (await sel.count()) await sel.first().selectOption("other");
  await page.getByLabel(/^Supplier$|^Fornecedor$/).fill(vendor);
  await page.getByLabel(/Monto estimado|Estimated amount/).fill(String(amount));
  await page.getByRole("button", { name: /Crear orden de compra|Create purchase order/ }).click();
  try { await page.waitForURL(/\/pos\/[0-9a-f-]{36}$/, { timeout: 15000 }); return page.url(); } catch { return false; }
};

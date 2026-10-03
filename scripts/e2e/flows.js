#!/usr/bin/env node
// End-to-end flows (phases 3+), run against the local harness (real PostgREST + RLS).
const { BASE: B, RUN, PASSWORD, ok, failures, launch, page, register, createProject, inviteEmployee, createList, buyOne } = require("./lib");
const only = process.argv[2] || "all";
const want = (n) => only === "all" || only === n;
const state = {};

async function phase3(browser) {
  const o = state.owner;
  // library
  await o.goto(B + "/materials");
  await o.getByRole("button", { name: /Agregar ítem|Add item/ }).click();
  await o.getByLabel(/Descripción|Description/).first().fill("3/4 in EMT conduit");
  await o.getByLabel(/Apodos|Nicknames/).fill("emt, tubo");
  await o.getByLabel(/Unidad|Unit/).selectOption("FT");
  await o.getByRole("button", { name: /^Guardar$|^Save$/ }).click();
  await o.waitForTimeout(1500);
  ok("library: item saved and listed", (await o.getByText("3/4 in EMT conduit").count()) > 0);
  await o.getByRole("button", { name: /Favorito|Favorite/ }).first().click();
  await o.waitForTimeout(1000);
  ok("library: favorite toggles", (await o.getByRole("button", { name: /Favorito|Favorite/ }).first().getAttribute("aria-pressed")) === "true");

  // request builder as owner
  await o.goto(`${B}/projects/${state.projectId}/materials/new`);
  await o.getByPlaceholder(/Busca un ítem|Search an item/).fill("tubo");
  ok("request: alias search finds the library item", (await o.getByRole("button", { name: /3\/4 in EMT conduit/ }).count()) > 0);
  await o.getByRole("button", { name: /3\/4 in EMT conduit/ }).first().click();
  await o.getByLabel(/^Cant\.$|^Qty$|^Qtd\.?$/).fill("1");
  await o.getByRole("button", { name: /Agregar a la lista|Add to list/ }).click();
  await o.getByRole("button", { name: /Pegar lista|Paste list/ }).click();
  await o.locator("textarea").first().fill("20 x 12/2 Romex 250ft\n5 ea Mud ring\n3/4 in EMT conduit x 10");
  await o.getByRole("button", { name: /Agregar 3 líneas|Add 3 lines/ }).click();
  ok("request: pasted list merges with library item (3 lines)", (await o.getByText(/Ítems del pedido \(3\)|Request items \(3\)/).count()) > 0, await o.locator("h2").allInnerTexts().then((a) => a.join("|")));
  await o.getByRole("button", { name: /Enviar pedido|Send request/ }).click();
  await o.waitForURL(/materials\/[0-9a-f-]{36}$/, { timeout: 30000 });
  state.mrUrl = o.url();
  ok("request: created with a number MR-", (await o.locator("h1").innerText()).startsWith("MR-"));
  ok("request: total quantity of the library item is 11", (await o.getByText(/11 FT/).count()) > 0);

  // employee with request permission (template employee_basic has can_request_material)
  const emp = await inviteEmployee(browser, o, "Luis Tester", `luis-${RUN}@bidpower-smoke.test`, "employee_basic", state.projectId);
  state.emp = emp;
  await emp.goto(`${B}/projects/${state.projectId}/materials/new`);
  await emp.getByPlaceholder(/Busca un ítem|Search an item/).fill("Breaker 20A");
  await emp.getByRole("button", { name: /Agregar "Breaker 20A"|Add "Breaker 20A"/ }).click();
  await emp.getByRole("button", { name: /Agregar a la lista|Add to list/ }).click();
  await emp.getByRole("button", { name: /Enviar pedido|Send request/ }).click();
  await emp.waitForURL(/materials\/[0-9a-f-]{36}$/, { timeout: 30000 });
  ok("employee: can create a request", true);
  await emp.goto(`${B}/projects/${state.projectId}/materials`);
  ok("employee: sees only own request (1)", (await emp.locator("a[href*='/materials/']").filter({ hasText: /MR-/ }).count()) === 1);
  await emp.goto(B + "/materials");
  ok("employee: library management is not open to them", emp.url().endsWith("/dashboard"));
  await emp.goto(B + "/materials/requests");
  ok("employee: cannot open the review list", emp.url().endsWith("/dashboard"));

  // owner review
  await o.goto(B + "/materials/requests");
  ok("owner: sees both requests", (await o.locator("a[href*='/materials/']").filter({ hasText: /MR-/ }).count()) === 2);
  await o.locator("a[href*='/materials/']").filter({ hasText: /Luis/ }).first().click();
  await o.getByRole("button", { name: /Marcar como revisado|Mark as reviewed/ }).click();
  await o.waitForTimeout(1500);
  ok("owner: review moves the request to reviewed", (await o.getByText(/Revisado|Reviewed/).count()) > 0);
  await o.goto(B + "/dashboard");
  ok("home: needs attention lists the pending request", (await o.getByText(/por revisar|to review/).count()) > 0);
}


async function phase45(browser) {
  const o = state.owner;
  // Pricing Request from the reviewed Material Request of the employee
  await o.goto(B + "/pricing/new");
  await o.getByLabel(/Desde una lista de material|From a material list/).selectOption({ index: 1 });
  await o.locator("summary").filter({ hasText: /Más opciones|More options/ }).click();
  await o.getByLabel(/^Título|^Title/).fill("Panel package");
  await o.locator("input[type=date]").fill("2030-01-15");
  await o.getByRole("button", { name: /Pedir cotización|Request quotes/ }).click();
  await o.waitForURL(/pricing\/[0-9a-f-]{36}$/, { timeout: 30000 });
  state.prUrl = o.url();
  ok("pricing: created with number PR-", (await o.locator("h1").innerText()).startsWith("PR-"));
  ok("pricing: lines copied from the material request", (await o.locator("ul li").filter({ hasText: /Breaker 20A|3\/4 in EMT/ }).count()) >= 1);

  // plans / files
  await o.locator("input[type=file]").setInputFiles({ name: "specs.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
  await o.waitForTimeout(1500);
  ok("pricing: file attached and listed", (await o.getByText("specs.pdf").count()) > 0);

  // secure link for Supply
  await o.getByLabel(/Nuevo supplier|New supplier/).first().fill("Graybar");
  await o.getByRole("button", { name: /Crear enlace seguro|Create secure link/ }).first().click();
  const linkBox = o.locator("p.break-all").first();
  await linkBox.waitFor({ timeout: 30000 });
  const link = (await linkBox.innerText()).trim();
  ok("pricing: supplier link generated", /\/supplier\/[a-f0-9]{64}$/.test(link));
  await o.reload();
  ok("pricing: the four steps are shown and the current one is marked", (await o.getByRole("list", { name: /Pasos de la cotización|Quote steps/ }).locator("li").count()) === 4 && (await o.locator("li[aria-current=step]").count()) === 1);
  ok("pricing: request is sent, waiting on supplier", (await o.getByText(/Esperando al supply|Waiting for the supplier/).count()) > 0);

  // Supply, no account
  const sup = await page(browser, 390, 844, "en-US");
  state.publicLinks = [...(state.publicLinks || []), link];
  await sup.goto(link);
  ok("supplier: sees company, no login", (await sup.locator("h1").innerText()).includes("Smoke Electric") && sup.url().includes("/supplier/"));
  ok("supplier: does NOT see the project name", (await sup.locator("body").innerText()).indexOf("Miami Beach") === -1);
  await sup.locator("textarea[aria-label]").last().fill("Is 3/4 EMT ok?");
  await sup.getByRole("button", { name: /Send question/ }).click();
  await sup.waitForTimeout(1200);
  await o.reload();
  ok("pricing: supplier question opens the request (waiting on owner)", (await o.getByText(/Preguntas del supplier|Supplier questions/).count()) > 0);
  await o.getByPlaceholder(/^Responder$|^Reply$/).fill("Yes, 3/4 EMT is fine");
  await o.getByRole("button", { name: /^Responder$|^Reply$/ }).click();
  await o.waitForTimeout(1200);

  await sup.reload();
  const priceInputs = sup.getByLabel(/^Price /);
  const n = await priceInputs.count();
  for (let i = 0; i < n; i++) await priceInputs.nth(i).fill(String(10 + i));
  await sup.getByLabel(/Quote number/).fill("Q-778");
  await sup.getByRole("button", { name: /Send my response/ }).click();
  await sup.waitForTimeout(1500);
  ok("supplier: response accepted", (await sup.getByRole("status").count()) > 0);

  await o.reload();
  ok("pricing: response shows quote number and total", (await o.getByText(/Q-778/).count()) > 0);
  await o.getByRole("button", { name: /Adjudicar|Award/ }).first().click().catch(() => {});
  await o.waitForTimeout(800);

  // Purchase Order from the response
  await o.getByRole("button", { name: /Crear orden de compra|Create purchase order/ }).first().click();
  await o.waitForURL(/\/pos\/[0-9a-f-]{36}$/, { timeout: 30000 });
  state.poUrl = o.url();
  ok("po: created from the supplier response, approved (owner has no limit)", (await o.getByText(/Aprobado|Approved/).count()) > 0);
  ok("po: lines carried over with prices", (await o.locator("ul li").filter({ hasText: /×/ }).count()) >= 1);
  // logistics: expected delivery date travels with "sent"; a past date is late and shows on Home
  await o.locator("input[type=date]").fill("2020-01-02");
  await o.getByRole("button", { name: /Marcar como enviado al supplier|Mark as sent to supplier/ }).click();
  await o.waitForTimeout(1500);
  ok("po logistics: expected delivery saved and flagged as late", (await o.getByText(/Atrasado|Late/).count()) > 0 && (await o.getByText(/Entrega esperada|Expected delivery/).count()) > 0);
  await o.goto(B + "/dashboard");
  ok("po logistics: a late delivery appears in Needs Attention", (await o.getByText(/entrega atrasada|delivery is late/).count()) > 0);
  await o.goto(B + "/pos");
  ok("po logistics: the PO list shows the expected date with the late tag", (await o.getByText(/Atrasado|Late/).count()) > 0);
  await o.goto(state.poUrl);
  // partial receiving: record part of the first line, the PO stays "sent"
  await o.getByLabel(/Cantidad recibida|Quantity received/).first().fill("1");
  await o.getByRole("button", { name: /Guardar lo recibido|Save what arrived/ }).click();
  await o.waitForTimeout(1500);
  ok("po logistics: partial receipt is recorded per line and the PO stays open", (await o.getByText(/Recibido 1 de|Received 1 of|Todo llegó|Everything arrived/).count()) > 0 && (await o.getByRole("button", { name: /Marcar como recibido|Mark as received/ }).count()) > 0);
  await o.getByRole("button", { name: /Marcar como recibido|Mark as received/ }).click();
  await o.waitForTimeout(1200);
  ok("po: received, receipt required to complete", (await o.getByText(/recibo, la factura o el packing slip|receipt, invoice or packing slip/i).count()) > 0);
  ok("po: cannot complete without a document (no complete form)", (await o.getByRole("button", { name: /Completar PO|Complete PO/ }).count()) === 0);
  await o.locator("input[type=file]").setInputFiles({ name: "receipt.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 receipt") });
  await o.waitForTimeout(1800);
  await o.getByLabel(/Costo real \(del documento\)|Actual cost \(from the document\)/).fill("123.45");
  await o.getByRole("button", { name: /Completar PO|Complete PO/ }).click();
  await o.waitForTimeout(2000);
  ok("po: completed", (await o.getByText(/Completado|Completed/).count()) > 0);

  // project control
  await o.goto(`${B}/projects/${state.projectId}`);
  ok("project: actual cost includes the completed PO", (await o.getByText(/123[.,]45/).count()) > 0);
  ok("project: control panel and waiting/activity sections render", (await o.getByText(/Control del proyecto|Project control/).count()) > 0 && (await o.getByText(/Actividad|Activity/).count()) > 0);

  // employee with PO limit: over-limit PO waits for approval
  const lim = await inviteEmployee(browser, o, "Pedro Compras", `pedro-${RUN}@bidpower-smoke.test`, "employee_purchasing", state.projectId);
  const limPO = await buyOne(lim, state.projectId, "Home Depot", 900);
  if (!limPO) throw new Error("limit employee could not buy");
  ok("po limit: over the limit waits for approval", (await lim.getByText(/Por aprobar|Pending approval/).count()) > 0);
  ok("po limit: creator cannot approve", (await lim.getByRole("button", { name: /^Aprobar$|^Approve$/ }).count()) === 0);
  const limUrl = lim.url();
  await o.goto(B + "/dashboard");
  ok("home: owner sees the PO to approve", (await o.getByText(/por aprobar|to approve/i).count()) > 0);
  await o.goto(limUrl);
  await o.getByRole("button", { name: /^Aprobar$|^Approve$/ }).click();
  await o.waitForTimeout(1500);
  ok("po limit: owner approves", (await o.getByText(/Aprobado|Approved/).count()) > 0);
}

async function phaseExpense(browser) {
  const o = state.owner;
  const emp = state.emp;
  await emp.goto(`${B}/expenses/new?projectId=${state.projectId}`);
  await emp.getByRole("button", { name: /Materiales|Materials/ }).first().click();
  await emp.locator("input[name=vendorName]").fill("Home Depot");
  await emp.locator("input[name=amount]").fill("50.25");
  await emp.locator("input[type=file]").setInputFiles({ name: "ticket.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) });
  await emp.getByRole("button", { name: /Guardar|Save/ }).click();
  await emp.waitForURL(/expenses\/[0-9a-f-]{36}/, { timeout: 30000 });
  ok("expense: employee's expense is pending review", (await emp.getByText(/Por aprobar|Pending review/).count()) > 0);
  ok("expense: receipt attached", (await emp.getByText("ticket.png").count()) > 0);
  ok("expense: employee cannot approve", (await emp.getByRole("button", { name: /^Aprobar$|^Approve$/ }).count()) === 0);
  const before = await (async () => { await o.goto(`${B}/projects/${state.projectId}`); return await o.locator("main").innerText(); })();
  ok("expense: pending expense does not count as actual cost yet", !/50[.,]25/.test(before.split("Costo real")[1]?.slice(0, 40) ?? ""));
  await o.goto(B + "/dashboard");
  ok("home: owner sees the expense to review", (await o.getByText(/Gasto por aprobar|Expense to review/).count()) > 0);
  await o.goto(B + "/expenses");
  await o.getByText("Home Depot").first().click();
  await o.getByRole("button", { name: /^Aprobar$|^Approve$/ }).click();
  await o.waitForTimeout(1500);
  ok("expense: owner approves", (await o.getByText(/Aprobado|Approved/).count()) > 0);
  await o.goto(`${B}/projects/${state.projectId}`);
  ok("project: approved expense now counts in actual cost", /50[.,]25|173[.,]70/.test(await o.locator("main").innerText()));
  await o.goto(B + "/expenses/new");
  await o.locator("input[name=amount]").fill("0");
  await o.getByRole("button", { name: /Guardar|Save/ }).click();
  await o.waitForTimeout(1200);
  ok("expense: zero amount is rejected with a message", (await o.getByRole("alert").count()) > 0);
}

async function phase6(browser) {
  const o = state.owner;
  await o.goto(`${B}/quotes/new?projectId=${state.projectId}`);
  ok("proposal: client is preselected from the project", (await o.locator("select[name=clientId]").inputValue()) !== "");
  ok("proposal: no sample clients in the list", (await o.locator("select[name=clientId] option").allInnerTexts()).every((x) => !/Rivera|Torres/.test(x)));
  await o.locator("input[type=text]").nth(0).fill("Panel upgrade 200A");
  await o.locator("input[type=number]").nth(1).fill("1200");
  await o.locator("input[name=taxRate]").fill("7.5");
  await o.getByRole("button", { name: /Nueva propuesta|New Proposal/ }).last().click();
  await o.waitForURL(/quotes\/[0-9a-f-]{36}$/, { timeout: 30000 });
  state.quoteUrl = o.url();
  ok("proposal: created and opened", (await o.getByText(/QT-/).count()) > 0);
  ok("proposal: total includes tax (1,290)", /1[.,]290/.test(await o.locator("main").innerText()));
  await o.getByRole("button", { name: /Crear enlace y enviar|Create link and send/ }).first().click();
  const linkBox = o.locator("p.break-all").first();
  await linkBox.waitFor({ timeout: 30000 });
  const link = (await linkBox.innerText()).trim();
  ok("proposal: customer link generated", /\/customer\/[a-f0-9]{64}$/.test(link));
  await o.reload();
  ok("proposal: sent, waiting on the customer", (await o.getByText(/Enviada|Enviado|Sent/).count()) > 0);

  const cust = await page(browser, 390, 844, "en-US");
  state.publicLinks = [...(state.publicLinks || []), link];
  await cust.goto(link);
  ok("customer: sees the proposal with total, no login", /1,290/.test(await cust.locator("main").innerText()) && cust.url().includes("/customer/"));
  ok("customer: sees no supplier/cost data", !/PO-|Graybar|Home Depot|margin|profit/i.test(await cust.locator("main").innerText()));
  await cust.getByLabel(/Your full name/).fill("");
  ok("customer: approve is disabled without a name", await cust.getByRole("button", { name: /^Approve$/ }).isDisabled());
  await cust.getByLabel(/Your full name/).fill("Carlos Cliente");
  await cust.getByRole("button", { name: /^Approve$/ }).click();
  await cust.waitForTimeout(1500);
  ok("customer: approval recorded", (await cust.getByText(/approval was recorded/i).count()) > 0);

  await o.reload();
  ok("proposal: approved by the customer's name", (await o.getByText(/Carlos Cliente/).count()) > 0);
  ok("proposal: no signature is claimed", (await o.getByText(/no es una firma|not a handwritten signature/i).count()) > 0);
  // Approved proposal -> bill it in parts, never more than its total
  const quoteUrl = o.url();
  await o.reload();
  ok("billing: an approved proposal offers to create an invoice", (await o.getByRole("link", { name: /Crear factura|Create invoice/ }).count()) > 0);
  await o.getByRole("link", { name: /Crear factura|Create invoice/ }).click();
  await o.waitForURL(/invoices\/new\?quoteId=/);
  ok("billing: the invoice number is suggested", /INV-\d{4}/.test(await o.locator("input[name=number]").inputValue()));
  await o.getByRole("button", { name: /^30%/ }).click();
  ok("billing: 30% of 1,290 fills the amount (387)", (await o.locator("input[name=amount]").inputValue()) === "387");
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  await o.locator("input[name=dueDate]").fill(yesterday);
  await o.getByRole("button", { name: /Guardar borrador|Save draft/ }).click();
  await o.waitForURL(quoteUrl, { timeout: 30000 });
  ok("billing: progress shows what has been billed", /387/.test(await o.locator("main").innerText()) && /Facturado|Billed/.test(await o.locator("main").innerText()));
  await o.goto(B + "/dashboard");
  ok("home: an approved proposal not fully billed reminds what is left (903)", (await o.getByText(/faltan .*903.* por facturar|903.* left to bill/).count()) > 0);
  await o.goto(quoteUrl);
  await o.getByRole("link", { name: /Crear factura|Create invoice/ }).click();
  await o.getByRole("button", { name: /Lo que falta|The rest/ }).click();
  ok("billing: the rest is what is left (903)", (await o.locator("input[name=amount]").inputValue()) === "903");
  await o.locator("main form").evaluate((f) => { f.noValidate = true; });
  await o.locator("input[name=amount]").fill("1000");
  await o.getByRole("button", { name: /Guardar borrador|Save draft/ }).click();
  await o.locator("p[role=alert]").waitFor({ timeout: 15000 });
  ok("billing: more than what is left is refused", /mayor a lo que falta|more than what is left/.test(await o.locator("p[role=alert]").innerText()));
  await o.locator("input[name=amount]").fill("903");
  await o.getByRole("button", { name: /Guardar borrador|Save draft/ }).click();
  await o.waitForURL(quoteUrl, { timeout: 30000 });
  ok("billing: fully billed, no more invoice button", (await o.getByRole("link", { name: /Crear factura|Create invoice/ }).count()) === 0);
  // The invoice itself: PDF, marked as sent, and cancelling only before anything is paid
  await o.locator("main a[href^='/invoices/']").first().click();
  await o.waitForURL(/invoices\/[0-9a-f-]{36}$/);
  const invUrl = o.url();
  ok("invoice: links back to its proposal", (await o.getByRole("link", { name: /Propuesta Q|Proposal Q|Propuesta |Proposal /}).count()) > 0);
  const pdf = await o.request.get(invUrl.replace(B + "/invoices/", B + "/api/invoices/") + "/pdf?lang=es");
  ok("invoice: the printable page answers with the number and the balance", pdf.status() === 200 && /INV-\d{4}/.test(await pdf.text()));
  await o.getByRole("button", { name: /Marcar como enviada|Mark as sent/ }).click();
  await o.waitForTimeout(1500);
  ok("invoice: marked as sent (and, being past its due date, it already shows as overdue)", (await o.getByText(/^Vencida$|^Overdue$/).count()) > 0 && (await o.getByRole("button", { name: /Marcar como enviada|Mark as sent/ }).count()) === 0);
  await o.locator("main input[type=number]").first().fill("100");
  await o.getByRole("button", { name: /Registrar pago|Record payment/ }).click();
  await o.waitForTimeout(1500);
  ok("invoice: after a payment it can no longer be cancelled", (await o.getByRole("button", { name: /Cancelar factura|Cancel invoice/ }).count()) === 0 && (await o.getByText(/^Vencida$|^Overdue$/).count()) > 0);
  ok("invoice: past its due date and not fully paid it shows as overdue", (await o.getByText(/^Vencida$|^Overdue$/).count()) > 0);
  await o.goto(B + "/dashboard");
  ok("home: the overdue invoice is listed with what you are owed", (await o.getByText(/vencida el .*287|overdue since .*287/).count()) > 0);
  await o.goto(`${B}/projects/${state.projectId}`);
  ok("project: shows billed, collected and still owed (287)", (await o.getByText(/Por cobrar|Still owed/).count()) > 0 && /287/.test(await o.locator("main").innerText()));
  await o.goto(B + "/clients");
  await o.locator("main a[href^='/clients/']").filter({ hasText: /Cliente Miami/ }).first().click();
  await o.waitForURL(/clients\/[0-9a-f-]{36}$/);
  await o.getByText(/Te debe|Owes you/).first().waitFor({ timeout: 10000 }).catch(() => undefined);
  ok("client: shows what the client owes", (await o.getByText(/Te debe .*287|Owes you .*287/).count()) > 0);
  await o.goto(B + "/calendar");
  ok("calendar: has the month list of deliveries and due dates", (await o.getByRole("region", { name: /Este mes|This month/ }).count()) > 0);
  // One box to find anything
  await o.goto(B + "/dashboard");
  await o.getByRole("search").getByRole("textbox").fill("Miami");
  await o.keyboard.press("Enter");
  await o.waitForURL(/\/search\?q=Miami/);
  ok("search: finds the project and the client by name", (await o.getByRole("link", { name: /Miami Beach/ }).count()) > 0 && (await o.getByRole("link", { name: /Cliente Miami/ }).count()) > 0);
  await o.goto(B + "/search?q=PO-2026");
  ok("search: finds purchase orders by number", (await o.getByRole("link", { name: /PO-2026/ }).count()) > 0);
  await o.goto(B + "/search?q=a");
  ok("search: a single letter asks for more", (await o.getByText(/al menos 2 letras|at least 2 letters/).count()) > 0);
  await o.goto(`${B}/projects/${state.projectId}`);
  ok("project: contract value taken from the approved proposal", /1[.,]290/.test(await o.locator("main").innerText()));

  await cust.reload();
  await cust.getByLabel(/Your full name/).fill("Carlos Cliente");
  await cust.locator("textarea").fill("Please add two outlets in the kitchen");
  await cust.getByRole("button", { name: /Send request/ }).click();
  await cust.waitForTimeout(1500);
  await o.goto(B + "/dashboard");
  ok("home: owner sees the customer's change request", (await o.getByText(/pidió un cambio|asked for a change/).count()) > 0);
  await o.goto(state.quoteUrl);
  ok("proposal: change request listed", (await o.getByText(/two outlets/).count()) > 0);
  await o.getByRole("button", { name: /Crear Change Order|Create Change Order/ }).first().click();
  await o.getByLabel(/Descripción|Description/).nth(1).fill("Two kitchen outlets");
  await o.getByLabel(/Precio|Price/).last().fill("150");
  await o.getByLabel(/Cant\.|Cantidad|Quantity/).last().fill("2");
  await o.getByRole("button", { name: /^Crear Change Order$|^Create Change Order$/ }).last().click();
  await o.waitForTimeout(2000);
  ok("change order: created with the difference (300)", (await o.getByText(/CO-/).count()) > 0 && /300/.test(await o.locator("main").innerText()));
  await o.getByRole("button", { name: /Crear enlace y enviar|Create link and send/ }).last().click();
  const coBox = o.locator("p.break-all").first();
  await coBox.waitFor({ timeout: 30000 });
  const coLink = (await coBox.innerText()).trim();
  const cust2 = await page(browser, 390, 844, "en-US");
  state.publicLinks = [...(state.publicLinks || []), coLink];
  await cust2.goto(coLink);
  ok("customer: change order page shows the difference", /300/.test(await cust2.locator("main").innerText()));
  await cust2.getByLabel(/Your full name/).fill("Carlos Cliente");
  await cust2.getByRole("button", { name: /^Approve$/ }).click();
  await cust2.waitForTimeout(1500);
  await o.goto(`${B}/projects/${state.projectId}`);
  ok("project: contract value grows by the approved change order (1,590)", /1[.,]590/.test(await o.locator("main").innerText()));

  // second proposal: request changes -> new version, old link dies
  await o.goto(`${B}/quotes/new?projectId=${state.projectId}`);
  await o.locator("input[type=text]").nth(0).fill("Lighting package");
  await o.locator("input[type=number]").nth(1).fill("500");
  await o.getByRole("button", { name: /Nueva propuesta|New Proposal/ }).last().click();
  await o.waitForURL(/quotes\/[0-9a-f-]{36}$/, { timeout: 30000 });
  const q2 = o.url();
  await o.getByRole("button", { name: /Crear enlace y enviar|Create link and send/ }).first().click();
  const l2 = (await o.locator("p.break-all").first().innerText()).trim();
  const c3 = await page(browser, 390, 844, "en-US");
  await c3.goto(l2);
  await c3.getByLabel(/Your full name/).fill("Carlos Cliente");
  await c3.getByRole("button", { name: /Request changes/ }).click();
  await c3.locator("textarea").fill("Cheaper fixtures please");
  await c3.getByRole("button", { name: /Send request/ }).click();
  await c3.waitForTimeout(1500);
  await o.goto(q2);
  ok("proposal v1: status changes requested", (await o.getByText(/Cambios pedidos|Changes requested/).count()) > 0);
  await o.getByRole("button", { name: /Nueva versión|New version/ }).click();
  await o.waitForURL((u) => u.toString() !== q2 && /quotes\/[0-9a-f-]{36}$/.test(u.toString()), { timeout: 30000 });
  ok("proposal v2: opened as an editable version 2", (await o.getByText(/Versión 2|Version 2/).count()) > 0);
  await c3.goto(l2);
  ok("customer: the old version's link no longer works", (await c3.getByText(/not valid|no es válido|não é válido/).count()) > 0);
}

async function phase78(browser) {
  const o = state.owner;
  await o.goto(`${B}/projects/${state.projectId}/takeoff`);
  ok("takeoff: PRELIMINARY banner shown", (await o.getByText(/PRELIMINAR|PRELIMINARY/).count()) > 0);
  await o.getByLabel(/^Título$|^Title$/).fill("Lobby");
  await o.getByRole("button", { name: /Crear takeoff|Create takeoff/ }).click();
  await o.waitForURL(/takeoffs\/[0-9a-f-]{36}$/, { timeout: 30000 });
  state.takeoffUrl = o.url();
  await o.getByLabel(/Tipo \/ descripción|Type \/ description/).fill("2x4 LED panel");
  await o.getByLabel(/^Cant\.$|^Quantity$/).first().fill("12");
  await o.getByRole("button", { name: /^Agregar$|^Add$/ }).first().click();
  await o.waitForTimeout(1200);
  await o.getByLabel(/Nombre del panel|Panel name/).fill("A");
  await o.getByLabel(/Bus \(A\)/).fill("200");
  await o.getByLabel(/Main \(A\)/).fill("200");
  await o.getByRole("button", { name: /Agregar panel|Add panel/ }).click();
  await o.waitForTimeout(1200);
  await o.getByRole("button", { name: /Agregar circuito|Add circuit/ }).click();
  await o.waitForTimeout(1200);
  await o.getByLabel(/Nombre$|^Name$/).fill("F1");
  await o.getByLabel(/Longitud \(ft\)|Length \(ft\)/).fill("100");
  await o.getByLabel(/Calibre conductor|Conductor size/).fill("#4 CU");
  await o.getByLabel(/Nº conductores|Conductors/).fill("3");
  await o.getByLabel(/^Conduit$|Conduit size/).fill("1-1/4\"");
  await o.getByLabel(/Tipo \(EMT|Type \(EMT/).fill("EMT");
  await o.getByRole("button", { name: /Agregar feeder|Add feeder/ }).click();
  await o.waitForTimeout(1500);
  const txt = await o.locator("main").innerText();
  ok("takeoff: counts appear in the material list", /2x4 LED panel[\s\S]*12 EA/.test(txt));
  ok("takeoff: breakers derived (20A 1-pole and 200A 2-pole main)", /20A 1-pole breaker/.test(txt) && /200A 2-pole breaker/.test(txt));
  ok("takeoff: wire length = 100 x 3 x 1.10 = 330 FT", /330 FT/.test(txt));
  ok("takeoff: says branch wire/fittings are not estimated", /no se estima|not estimated/i.test(txt));
  await o.getByRole("button", { name: /Marcar como verificado|Mark as verified/ }).click();
  await o.waitForTimeout(1500);
  ok("takeoff: verified by the manager", (await o.getByText(/Verificado por|Verified by/).count()) > 0);
  await o.getByLabel(/^Cant\.$|^Quantity$/).first().fill("3");
  await o.getByLabel(/Tipo \/ descripción|Type \/ description/).fill("Exit sign");
  await o.getByRole("button", { name: /^Agregar$|^Add$/ }).first().click();
  await o.waitForTimeout(1500);
  ok("takeoff: editing a verified takeoff sends it back to unverified", (await o.getByText(/Marcar como verificado|Mark as verified/).count()) > 0);
  await o.getByRole("button", { name: /Enviar como lista de material|Send as material list/ }).click();
  await o.waitForTimeout(2500);
  await o.goto(B + "/materials/requests");
  ok("takeoff: material request created with the PRELIMINARY note", (await o.locator("a[href*='/materials/']").filter({ hasText: /MR-/ }).count()) >= 1);
}

async function phase9(browser) {
  const o = state.owner;
  // Supply house registers with its own account type
  const sp = await page(browser, 390, 844, "es-ES");
  await sp.goto(B + "/register");
  await sp.getByRole("textbox").nth(0).fill("Sam Supply");
  await sp.getByRole("textbox").nth(1).fill(`supply-${RUN}@bidpower-smoke.test`);
  await sp.locator("input[type=password]").fill("Smoke-test-123");
  await sp.getByRole("button", { name: /Continuar|Continue/ }).click();
  await sp.getByRole("radio", { name: /Supply house/ }).click();
  await sp.locator("input[name=companyNameField]").fill("Graybar Supply");
  ok("supply register: business type selector is hidden for supply", (await sp.locator("select[name=businessType]").count()) === 0);
  await sp.getByRole("button", { name: /Crear empresa|Create free company/ }).click();
  await sp.waitForURL("**/supply", { timeout: 30000 });
  state.supply = sp;
  ok("supply: lands on the supply inbox", (await sp.getByText(/Bandeja|Inbox/).count()) > 0);
  await sp.goto(B + "/dashboard");
  ok("supply: contractor dashboard is not reachable (redirected)", sp.url().endsWith("/supply"));
  await sp.goto(B + "/projects");
  ok("supply: contractor modules are not reachable", sp.url().endsWith("/supply"));
  await o.goto(B + "/supply");
  ok("contractor: supply workspace is not reachable", o.url().endsWith("/dashboard"));

  // connection code
  await sp.goto(B + "/supply/contractors");
  await sp.getByRole("button", { name: /Generar código|Generate code/ }).click();
  const code = (await sp.getByTestId("connect-code").innerText()).trim();
  ok("supply: single-use code generated (24 hex)", /^[a-f0-9]{24}$/.test(code));
  const joinLink = (await sp.getByTestId("connect-link").innerText()).trim();
  ok("supply: a link to share carries the code", joinLink.endsWith(`/suppliers?code=${code}`));
  // The contractor opens the link signed out: login first, then straight to the supplier page with the code filled in
  const guest = await page(browser, 390, 844);
  await guest.goto(joinLink);
  ok("link: signed-out visitor goes to login and remembers where they were going", guest.url().includes("/login"));
  await guest.locator("input[type=email]").fill(`owner-${RUN}@bidpower-smoke.test`);
  await guest.locator("input[type=password]").fill(PASSWORD);
  await guest.getByRole("button", { name: /^Entrar$|^Sign in$|^Log in$/ }).click();
  await guest.waitForURL(/\/suppliers\?code=/, { timeout: 30000 });
  ok("link: after login the supplier page opens with the code already typed", (await guest.getByLabel(/Código que te dio el supply|Code the supply gave you/).inputValue()) === code);
  await o.goto(B + "/suppliers");
  await o.getByLabel(/Código que te dio el supply|Code the supply gave you/).fill("0".repeat(24));
  await o.getByRole("button", { name: /Conectar con un código|Connect with a code/ }).last().click();
  await o.waitForTimeout(1200);
  ok("contractor: a wrong code is refused with a message", (await o.getByRole("alert").count()) > 0);
  await o.getByLabel(/Código que te dio el supply|Code the supply gave you/).fill(code);
  await o.getByRole("button", { name: /Conectar con un código|Connect with a code/ }).last().click();
  await o.waitForTimeout(1800);
  ok("contractor: connected, supplier record shows Connected", (await o.getByText("Graybar Supply").count()) > 0 && (await o.getByText(/^Conectado$|^Connected$/).count()) > 0);

  // pricing request sent inside the app
  await createList(o, state.projectId, "12 x 2x4 LED panel\n40 x Duplex outlet", 2);
  await o.goto(B + "/pricing/new");
  ok("pricing: no blank form, the list is chosen", (await o.getByLabel(/Desde una lista de material|From a material list/).count()) > 0 && (await o.getByText(/Líneas \(una por línea|Lines \(one per line/).count()) === 0);
  await o.locator("summary").filter({ hasText: /Más opciones|More options/ }).click();
  await o.getByLabel(/^Título|^Title/).fill("Lobby package");
  await o.locator("input[type=date]").fill("2030-02-01");
  await o.getByRole("button", { name: /Pedir cotización|Request quotes/ }).click();
  await o.waitForURL(/pricing\/[0-9a-f-]{36}$/, { timeout: 30000 });
  state.pr2 = o.url();
  await o.locator("input[type=file]").setInputFiles({ name: "lighting-plan.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 plan") });
  await o.waitForTimeout(1500);
  await o.getByRole("combobox").filter({ has: o.locator("option", { hasText: "Graybar Supply" }) }).first().selectOption({ label: "Graybar Supply" });
  await o.getByRole("button", { name: /Enviar a su cuenta Supply|Send to their Supply account/ }).click();
  await o.waitForTimeout(1800);
  ok("pricing: sent to the Supply account (no link to share)", (await o.getByText(/Verán la solicitud|will see the request/).count()) > 0 && (await o.locator("p.break-all").count()) === 0);

  // supply inbox
  await sp.goto(B + "/supply");
  ok("supply inbox: shows the request with the contractor and the Bid Date", (await sp.getByText(/Lobby package/).count()) > 0 && (await sp.getByText(/Smoke Electric/).count()) > 0);
  await sp.getByText(/Lobby package/).first().click();
  await sp.waitForURL(/supply\/requests\/[0-9a-f-]{36}$/);
  ok("supply request: sees the lines and the plans file", (await sp.getByText(/2x4 LED panel/).count()) > 0 && (await sp.getByText("lighting-plan.pdf").count()) > 0);
  ok("supply request: does not see the project name", (await sp.locator("body").innerText()).indexOf("Miami Beach") === -1);
  await sp.locator("textarea[aria-label]").last().fill("Do you want 4000K?");
  await sp.getByRole("button", { name: /Enviar pregunta|Send question/ }).click();
  await sp.waitForTimeout(1200);
  const priceInputs = sp.getByLabel(/^Precio |^Price /);
  const n = await priceInputs.count();
  for (let i = 0; i < n; i++) await priceInputs.nth(i).fill(String(20 + i));
  await sp.getByLabel(/Nº de cotización|Quote number/).fill("GB-1001");
  await sp.getByRole("button", { name: /Enviar mi respuesta|Send my response/ }).click();
  await sp.waitForTimeout(1800);
  ok("supply request: quote sent", (await sp.getByRole("status").count()) > 0);
  await sp.goto(B + "/supply");
  await sp.getByRole("button", { name: /Cotizados|Quoted/ }).click();
  ok("supply inbox: the quote shows under Quoted with its number", (await sp.getByText(/GB-1001/).count()) > 0);

  // contractor side sees it like any other response
  await o.goto(state.pr2);
  ok("pricing: the supply's quote arrives in the normal comparison", (await o.getByText(/GB-1001/).count()) > 0);
  ok("pricing: the supply's question is listed", (await o.getByText(/4000K/).count()) > 0);

  // supply revokes
  await sp.goto(B + "/supply/contractors");
  ok("supply: sees the contractor with counters", (await sp.getByText(/Smoke Electric/).count()) > 0 && (await sp.getByText(/1 solicitudes|1 requests/).count()) > 0);
  sp.on("dialog", (d) => d.accept());
  await sp.getByRole("button", { name: /^Revocar$|^Revoke$/ }).click();
  await sp.waitForTimeout(1500);
  await sp.goto(B + "/supply");
  ok("supply: after disconnecting the inbox is empty", (await sp.getByText(/Lobby package/).count()) === 0);
  await o.goto(B + "/suppliers");
  ok("contractor: supplier shows as not connected after disconnect", (await o.getByText(/Sin cuenta|No account/).count()) > 0);
}

async function phase10(browser) {
  const o = state.owner;
  if (!state.emp) state.emp = await inviteEmployee(browser, o, "Luis Tester", `luis-${RUN}@bidpower-smoke.test`, "employee_basic", state.projectId);
  const emp = state.emp;

  // access: only the Owner (or a Manager who may view costs)
  const denied = await emp.request.get(B + "/api/accounting/export?dataset=customers&format=csv");
  ok("accounting: an employee gets 403 from the export endpoint", denied.status() === 403);
  await emp.goto(B + "/accounting");
  ok("accounting: an employee is redirected away from the page", !emp.url().includes("/accounting"));
  const anon = await (await browser.newContext()).request.get(B + "/api/accounting/export?dataset=customers&format=csv", { maxRedirects: 0 });
  ok("accounting: no session is refused", [307, 401, 403].includes(anon.status()));

  // the Owner exports
  await o.goto(B + "/accounting");
  ok("accounting: the Owner sees the page with the QuickBooks note", (await o.getByText(/QuickBooks/).count()) > 0);
  const csv = await o.request.get(B + "/api/accounting/export?dataset=customers&format=csv");
  const text = await csv.text();
  ok("accounting: customers CSV downloads with BOM, header and the customer", csv.status() === 200 && text.startsWith("\uFEFFid,name,contact_name") && text.includes("Cliente Miami") && text.includes("\r\n"));
  ok("accounting: CSV has an attachment filename", /attachment; filename="bidpower-customers-\d{4}-\d{2}-\d{2}\.csv"/.test(csv.headers()["content-disposition"] || ""));
  const exp = await o.request.get(B + "/api/accounting/export?dataset=expenses&format=json");
  const expJson = await exp.json();
  ok("accounting: expenses JSON only carries approved/reimbursed", exp.status() === 200 && expJson.rows.every((r) => ["approved", "reimbursed"].includes(r.status)));
  const pc = await o.request.get(B + "/api/accounting/export?dataset=project_costs&format=csv");
  ok("accounting: project costs CSV lists the project with forecast", pc.status() === 200 && (await pc.text()).includes("forecast_cost"));
  const all = await o.request.get(B + "/api/accounting/export?dataset=all&format=json");
  const allJson = await all.json();
  ok("accounting: all-in-one JSON has the seven datasets", all.status() === 200 && Object.keys(allJson.datasets).length === 7);
  ok("accounting: validation rejects bad dataset, all as CSV, bad and inverted dates", (await o.request.get(B + "/api/accounting/export?dataset=nope")).status() === 400 && (await o.request.get(B + "/api/accounting/export?dataset=all&format=csv")).status() === 400 && (await o.request.get(B + "/api/accounting/export?dataset=expenses&from=2026-13-99x")).status() === 400 && (await o.request.get(B + "/api/accounting/export?dataset=expenses&from=2026-02-01&to=2026-01-01")).status() === 400);
  const filtered = await o.request.get(B + "/api/accounting/export?dataset=expenses&format=json&from=2001-01-01&to=2001-01-02");
  ok("accounting: a date range with nothing returns zero rows", (await filtered.json()).rows.length === 0);

  // the audit log records them and is visible on the page
  await o.goto(B + "/accounting");
  ok("accounting: the export history lists the downloads", (await o.getByText(/Clientes · CSV|Customers · CSV/).count()) > 0 && (await o.getByText(/Todo \(JSON\) · JSON|Everything \(JSON\) · JSON/).count()) > 0);
  // mobile
  const m = await page(browser, 390, 844);
  await m.context().addCookies(await o.context().cookies());
  await m.goto(B + "/accounting");
  ok("accounting: mobile has no horizontal overflow", await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
}

async function phaseLang(browser) {
  const o = state.owner;
  // Settings start from the saved company (never from placeholders) and saving reports in the current language
  await o.goto(B + "/settings");
  ok("settings: the company form starts from the saved name", (await o.locator("input[name=name]").inputValue()) === "Smoke Electric");
  ok("settings: no invented demo values", (await o.locator("body").innerText()).indexOf("ElectricPro") === -1 && (await o.locator("input[name=phone]").nth(0).inputValue()) !== "(305) 555-0142");
  await o.locator("input[name=fullName]").fill("Ana Owner");
  await o.getByRole("button", { name: /^Guardar$|^Save$/ }).first().click();
  await o.waitForTimeout(1500);
  ok("settings: profile saves with a translated confirmation", (await o.getByText(/Guardado correctamente|Saved successfully/).count()) > 0);
  // Categories are real: a new one shows up in the expense form
  await o.goto(B + "/settings/categories");
  await o.getByPlaceholder(/Nombre de la categoría|Category name/).fill("Baterías");
  await o.getByRole("button", { name: /^Crear$|^Create$/ }).first().click();
  await o.waitForTimeout(1500);
  await o.goto(B + "/expenses/new");
  ok("categories: the new category is offered in the expense form", (await o.getByRole("button", { name: "Baterías" }).count()) > 0);
  // Language: the whole shell follows the chosen language, first paint included
  await o.goto(B + "/dashboard");
  await o.evaluate(() => localStorage.setItem("bidpower-locale", "en"));
  await o.reload({ waitUntil: "networkidle" });
  const en = (await o.locator("nav, aside").allInnerTexts()).join(" ");
  ok("language EN: navigation is in English", /sales/i.test(en) && /purchasing/i.test(en) && /connections/i.test(en) && !/ventas|compras|conexiones/i.test(en));
  await o.goto(B + "/settings/categories");
  ok("language EN: system categories are translated", (await o.getByText("Materials").count()) > 0 && (await o.getByText("Materiales").count()) === 0);
  const pdfEn = await o.request.get(B + "/api/quotes/00000000-0000-0000-0000-000000000000/pdf?lang=en");
  ok("pdf: unknown quote is a clean 404", pdfEn.status() === 404);
  await o.evaluate(() => localStorage.setItem("bidpower-locale", "es"));
  await o.goto(B + "/dashboard", { waitUntil: "networkidle" });
  const es = await o.locator("body").innerText();
  ok("language ES: navigation is in Spanish", /ventas/i.test(es) && /compras/i.test(es) && /conexiones/i.test(es));
  // first steps come from what really exists; feedback is stored for the team
  await o.goto(B + "/dashboard");
  const fresh = await page(browser);
  await register(fresh, "Nuevo Owner", `fresh-${RUN}@bidpower-smoke.test`, "Fresh Co");
  await fresh.goto(B + "/dashboard");
  ok("onboarding: a brand-new company sees the checklist at 1/6 (only 'create company' is done)", (await fresh.getByText(/Primeros pasos|First steps/).count()) > 0 && (await fresh.getByText("1/6").count()) > 0);
  await o.goto(B + "/feedback");
  await o.getByRole("textbox").first().fill("Prueba de comentario: falta X");
  await o.getByRole("button", { name: /^Enviar$|^Send$/ }).click();
  await o.waitForTimeout(1500);
  ok("feedback: sent and listed under the person's previous comments", (await o.getByText(/Gracias, lo recibimos|Thank you, we got it/).count()) > 0 && (await o.getByText("Prueba de comentario: falta X").count()) > 0);
  // import ready-made materials with part numbers; a field name finds the part number and the reverse
  await o.goto(B + "/materials");
  await o.getByRole("button", { name: /Importar lista|Import list/ }).click();
  await o.getByLabel(/o pega aquí las filas|or paste the rows here|ou cole as linhas aqui/i).fill("description,part number,manufacturer,unit,category,aliases\r\nTHHN 10 AWG stranded black,THHN-10-STR-BLK,Southwire,FT,wire,\"cable 10 negro, #10 black\"\r\n20A single-pole breaker,BR120,Eaton,EA,breakers,");
  ok("import: preview counts the ready rows", (await o.getByText(/2 materiales listos|2 items ready/).count()) > 0);
  await o.getByRole("button", { name: /^Importar$|^Import$/ }).click();
  await o.waitForTimeout(2000);
  ok("import: created and reported", (await o.getByText(/Importados: 2|Imported: 2/).count()) > 0);
  await o.getByPlaceholder(/Buscar|Search/).first().fill("cable 10 negro");
  ok("import: finding it by the field name shows the part number", (await o.getByText(/THHN-10-STR-BLK/).count()) > 0);
  await o.getByPlaceholder(/Buscar|Search/).first().fill("thhn-10-str-blk");
  ok("import: finding it by the part number works too", (await o.getByText(/THHN 10 AWG stranded black/).count()) > 0);
  await o.goto(B + "/materials");
  await o.getByRole("button", { name: /Importar lista|Import list/ }).click();
  await o.getByLabel(/o pega aquí las filas|or paste the rows here|ou cole as linhas aqui/i).fill("description,part number\r\nTHHN 10 AWG stranded black,thhn-10-str-blk\r\nNew item,NEW-1");
  await o.getByRole("button", { name: /^Importar$|^Import$/ }).click();
  await o.waitForTimeout(2000);
  ok("import: an existing part number is skipped, the new one is created", (await o.getByText(/Importados: 1\. Ya existían: 1|Imported: 1\. Already existed: 1/).count()) > 0);
  // an Excel file is read as it is, no need to save it as CSV first
  await o.goto(B + "/materials");
  await o.getByRole("button", { name: /Importar lista|Import list/ }).click();
  await o.locator("input[type=file]").setInputFiles(require("path").join(__dirname, "fixtures", "materials.xlsx"));
  await o.getByText(/2 materiales listos|2 items ready/).waitFor({ timeout: 15000 });
  await o.getByRole("button", { name: /^Importar$|^Import$/ }).click();
  await o.waitForTimeout(2000);
  ok("import: an Excel (.xlsx) file is read and imported", (await o.getByText(/Importados: 2|Imported: 2/).count()) > 0);
  // price history comes only from real POs and quotes; an empty history says so
  await o.goto(B + "/materials");
  if (await o.locator("ul li button.flex-1").count()) {
    await o.locator("ul li button.flex-1").first().click();
    await o.waitForTimeout(1500);
    ok("materials: the price history section loads (real prices or an honest empty state)", (await o.getByText(/Historial de precios|Price history/).count()) > 0 && (await o.getByText(/Aún no hay precios|No prices for this material|\$\d/).count()) > 0);
  }
  await o.goto(B + "/pagina-que-no-existe");
  ok("404 page is translated", (await o.getByText(/No encontramos esta página/).count()) > 0);
}

async function phaseFlow(browser) {
  const o = state.owner;
  await o.evaluate(() => localStorage.setItem("bidpower-locale", "es"));
  // Home answers "what do you want to do?" with four plain actions
  await o.goto(B + "/dashboard", { waitUntil: "networkidle" });
  const quick = o.getByRole("region", { name: /¿Qué quieres hacer\?|What do you want to do\?/ });
  ok("flow: home offers the four actions (project, material, proposal, expense)", (await quick.locator("a").count()) === 4);
  // Old screens that only said "it does not exist" are gone; the company area is one place
  ok("flow: removed screens answer 404", (await o.request.get(B + "/quotes/estimator")).status() === 404 && (await o.request.get(B + "/files")).status() === 404);
  await o.goto(B + "/my-company");
  ok("flow: My company sends to Settings", o.url().endsWith("/settings"));
  // The one door for material, with three ways out. Buy now = purchase order with the list's lines.
  await o.goto(B + "/material");
  if (!/materials\/new$/.test(o.url())) await o.locator("main a[href$='/materials/new']").first().click();
  await o.waitForURL(/materials\/new$/);
  await o.getByPlaceholder(/Busca un ítem|Search an item/).fill("Conduit 1 in EMT x 20");
  await o.keyboard.press("Enter");
  await o.getByRole("button", { name: /Enviar pedido|Send request/ }).click();
  await o.waitForURL(/materials\/[0-9a-f-]{36}$/, { timeout: 30000 });
  ok("flow: after the list the next step offers ask-quotes and buy-now", (await o.getByText(/¿Qué quieres hacer con esta lista\?|What do you want to do with this list\?/).count()) > 0 && (await o.getByText(/Pedir cotización a suppliers|Request quotes from suppliers/).count()) > 0 && (await o.getByText(/Comprar ya|Buy now/).count()) > 0);
  await o.getByRole("button", { name: /Comprar ya|Buy now/ }).click();
  const sel = o.locator("select").filter({ has: o.locator("option", { hasText: /Otro|Other/ }) });
  if (await sel.count()) await sel.first().selectOption("other");
  await o.getByLabel(/^Supplier$|^Fornecedor$/).fill("Corner Electric");
  await o.getByLabel(/Monto estimado|Estimated amount/).fill("250");
  await o.getByRole("button", { name: /Crear orden de compra|Create purchase order/ }).click();
  await o.waitForURL(/\/pos\/[0-9a-f-]{36}$/, { timeout: 30000 });
  ok("flow: buy-now creates a purchase order with the list's line and the supplier", (await o.getByText("Corner Electric").count()) > 0 && (await o.getByText(/Conduit 1 in EMT/).count()) > 0);
  // Connections: a supplier with people (name + email)
  await o.goto(B + "/suppliers");
  await o.getByLabel(/Nombre de la empresa \(supplier\)|Supplier company name/).fill("Acme Supply");
  await o.getByLabel(/Nombre del contacto|Contact name/).first().fill("Laura Ventas");
  await o.getByLabel(/Correo del contacto|Contact email/).first().fill("not-an-email");
  await o.getByRole("button", { name: /Agregar supplier|Add supplier/ }).last().click();
  await o.waitForTimeout(1200);
  ok("connections: an invalid contact email is refused", (await o.getByText(/El correo no es válido|The email is not valid/).count()) > 0);
  await o.getByLabel(/Correo del contacto|Contact email/).first().fill("laura@acme.test");
  await o.getByRole("button", { name: /Agregar supplier|Add supplier/ }).last().click();
  await o.waitForTimeout(1500);
  ok("connections: the supplier shows its primary contact with name and email", (await o.getByText("Acme Supply").count()) > 0 && (await o.getByText("Laura Ventas").count()) > 0 && (await o.getByText("laura@acme.test").count()) > 0 && (await o.getByText(/Principal|Primary/).count()) > 0);
  const card = o.locator("li").filter({ hasText: "Acme Supply" }).first();
  await card.locator("summary").click();
  await card.getByLabel(/Nombre del contacto|Contact name/).fill("Pedro Mostrador");
  await card.getByLabel(/Correo del contacto|Contact email/).fill("laura@acme.test");
  await card.getByRole("button", { name: /Agregar contacto|Add contact/ }).last().click();
  await o.waitForTimeout(1200);
  ok("connections: the same email twice in a supplier is refused", (await o.getByText(/Ya existe un contacto|already exists/).count()) > 0);
  await card.getByLabel(/Correo del contacto|Contact email/).fill("pedro@acme.test");
  await card.getByRole("button", { name: /Agregar contacto|Add contact/ }).last().click();
  await o.waitForTimeout(1500);
  ok("connections: a second contact is added", (await o.getByText("Pedro Mostrador").count()) > 0);
  // Quote road: ask for quotes, the supplier answers with a PDF, the contractor enters only the total, buys from it
  await o.goto(B + "/material");
  if (!/materials\/new$/.test(o.url())) await o.locator("main a[href$='/materials/new']").first().click();
  await o.waitForURL(/materials\/new$/);
  await o.getByPlaceholder(/Busca un ítem|Search an item/).fill("Wire 12 AWG black x 100");
  await o.keyboard.press("Enter");
  await o.getByRole("button", { name: /Enviar pedido|Send request/ }).click();
  await o.waitForURL(/materials\/[0-9a-f-]{36}$/, { timeout: 30000 });
  await o.getByRole("link", { name: /Pedir cotización a suppliers|Request quotes from suppliers/ }).click();
  await o.waitForURL(/pricing\/new/);
  await o.getByRole("button", { name: /Pedir cotización|Request quotes/ }).click();
  await o.waitForURL(/pricing\/[0-9a-f-]{36}$/, { timeout: 30000 });
  {
    const sel = o.locator("section").filter({ hasText: /2 · A quién se lo pides|2 · Who you ask/ }).locator("select").first();
    await sel.selectOption({ label: "Acme Supply" });
    ok("connections: choosing the supplier offers its contacts and fills the email", (await o.getByText(/Laura Ventas/).count()) > 0 && (await o.locator("input[type=email]").first().inputValue()) === "laura@acme.test");
  }
  await o.getByRole("button", { name: /Registrar respuesta|Record response/ }).click();
  await o.locator("section").filter({ hasText: /Registrar respuesta|Record response|Cotizaciones recibidas|Quotes received/ }).last().getByLabel(/Nuevo supplier|New supplier/i).fill("Graybar PDF");
  await o.getByLabel(/Total de la cotización|Quote total/).first().fill("480");
  await o.getByRole("button", { name: /Guardar respuesta|Save response/ }).click();
  await o.waitForTimeout(1800);
  ok("flow: a supplier answer with only the total is enough to compare", (await o.getByText(/480/).count()) > 0 && (await o.getByText("Graybar PDF").count()) > 0);
  await o.getByRole("button", { name: /Adjudicar|Award/ }).first().click();
  await o.waitForTimeout(1500);
  await o.getByRole("button", { name: /Crear orden de compra|Create purchase order/ }).first().click();
  await o.waitForURL(/\/pos\/[0-9a-f-]{36}$/, { timeout: 30000 });
  ok("flow: the purchase order from a total-only quote keeps the lines and the quoted total", (await o.getByText(/480/).count()) > 0 && (await o.getByText(/Wire 12 AWG black/).count()) > 0);
  // The employee sees only what belongs to the employee
  const emp = state.emp;
  if (emp) {
    await emp.goto(B + "/dashboard", { waitUntil: "networkidle" });
    const nav = (await emp.locator("nav, aside").allInnerTexts()).join(" ");
    ok("flow: the employee's menu has no Sales or Connections", !/ventas|conexiones|sales|connections/i.test(nav));
    const blocked = await emp.request.get(B + "/quotes", { maxRedirects: 0 });
    ok("flow: the employee cannot open Proposals", blocked.status() >= 300 || !(await emp.goto(B + "/quotes").then(() => emp.url().includes("/quotes"))));
  }

  // Proposal lines suggest items from the library while typing
  await o.goto(B + "/quotes/new");
  const desc = o.locator("input[autocomplete=off]").first();
  await desc.fill("emt");
  await o.getByRole("option", { name: /3\/4 in EMT conduit/ }).first().click();
  ok("proposal: typing in the description suggests library items and fills the line", (await desc.inputValue()).includes("3/4 in EMT conduit"));

  // The floating + follows the page it is on
  const fabItems = async (path) => {
    await o.goto(B + path);
    await o.getByRole("button", { name: /^Crear$|^Create$/ }).click();
    return (await o.locator("div.fixed a").allInnerTexts()).join("|");
  };
  ok("fab: home offers the four starts", /Nuevo proyecto|New project/.test(await fabItems("/dashboard")));
  ok("fab: suppliers offers add supplier and request quotes", /Agregar supplier|Add supplier/.test(await fabItems("/suppliers")) && /Pedir cotización|Request quotes/.test(await o.locator("div.fixed a").allInnerTexts().then((a) => a.join("|"))));
  ok("fab: library offers add item and import", /Agregar ítem|Add item/.test(await fabItems("/materials")) && /Importar lista|Import list/.test(await o.locator("div.fixed a").allInnerTexts().then((a) => a.join("|"))));
  ok("fab: projects offers new project and new client", /Nuevo cliente|New client/.test(await fabItems("/projects")));
  await o.goto(B + "/projects/new");
  ok("fab: hidden on forms", (await o.getByRole("button", { name: /^Crear$|^Create$/ }).count()) === 0);
}

async function phaseEmployee(browser) {
  const o = state.owner;
  // The purchasing template is the one that may buy (up to its PO limit).
  // (The Free plan allows 3 employees, so a full run reuses Luis and gives him the purchasing template.)
  let emp;
  if (state.emp) {
    emp = state.emp;
    await o.goto(B + "/employees");
    await o.getByText("Luis Tester").first().click();
    await o.waitForURL(/employees\/[0-9a-f-]{36}/);
    await o.getByRole("button", { name: /Empleado con compras|Employee with purchasing/ }).click();
    await o.getByRole("button", { name: /Guardar cambios|Save changes/ }).click();
    await o.waitForTimeout(1500);
  } else emp = await inviteEmployee(browser, o, "Pedro Compras", `pedro-${RUN}@bidpower-smoke.test`, "employee_purchasing", state.projectId);
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  await emp.goto(B + "/dashboard");
  ok("employee home: one door to ask for or buy material", (await emp.getByRole("link", { name: /Pedir o comprar material|Ask for or buy material/ }).count()) > 0);
  ok("employee home: no money or clients on it", (await emp.locator("main, body").first().innerText()).search(/Ganancia|Profit|Clientes|Clients/) === -1);
  await buyOne(emp, state.projectId, "Corner A", 50);
  const first = emp.url();
  await buyOne(emp, state.projectId, "Corner B", 50);
  const third = await buyOne(emp, state.projectId, "Corner C", 50);
  ok("receipts: a third purchase is refused while two receipts are missing", third === false && /2 compras sin recibo|2 purchases without a receipt/.test(await emp.locator("div[role=alert]").filter({ hasText: /\S/ }).first().innerText()));
  await emp.goto(B + "/dashboard");
  ok("receipts: home shows the receipts due", (await emp.getByText(/Recibos por subir|Receipts to hand in/).count()) > 0);
  await emp.goto(first);
  ok("receipts: the employee sees the camera button, not a document-type picker", (await emp.getByRole("button", { name: /Tomar foto del recibo|Take a photo of the receipt/ }).count()) > 0 && (await emp.locator("select").count()) === 0);
  await emp.locator("input[type=file]:not([capture])").setInputFiles({ name: "specs.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
  await emp.waitForTimeout(1500);
  ok("receipts: a PDF is refused for the employee (photo only)", (await emp.locator("div[role=alert]").filter({ hasText: /\S/ }).count()) > 0);
  await emp.locator("input[capture]").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: PNG });
  await emp.waitForTimeout(2000);
  await emp.reload();
  ok("receipts: the photo is attached to the purchase order", (await emp.getByText("receipt.png").count()) > 0);
  ok("receipts: handing in one receipt lets the employee buy again", (await buyOne(emp, state.projectId, "Corner D", 50)) !== false);
  await o.goto(B + "/dashboard");
  ok("owner home: team purchases lists who bought where", (await o.getByRole("region", { name: /Compras del equipo|Team purchases/ }).getByText(/compró en Corner|bought at Corner/).count()) > 0);
}

// Walks the whole app by following its own links, as the owner and as the employee, on a phone, a tablet and a desktop.
// Every page must answer, throw no error, and not scroll sideways.
async function phaseCrawl(browser) {
  const VIEWPORTS = [[390, 844, "phone"], [820, 1180, "tablet"], [1300, 900, "desktop"]];
  const skip = /^\/(api|auth)\b|logout|\/(customer|supplier|invite)\//;
  const crawlAs = async (pg, who, seeds, max) => {
    const seen = new Set(), queue = [...seeds], bad = [];
    const errors = [];
    pg.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
    pg.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource.*(404|401)/.test(m.text())) errors.push(m.text().slice(0, 120)); });
    while (queue.length && seen.size < max) {
      const path = queue.shift();
      const key = path.split("#")[0];
      if (seen.has(key) || skip.test(key)) continue;
      seen.add(key);
      for (const [w, h, name] of VIEWPORTS) {
        await pg.setViewportSize({ width: w, height: h });
        errors.length = 0;
        const res = await pg.goto(B + key, { waitUntil: "networkidle" }).catch(() => null);
        const status = res ? res.status() : 0;
        const overflow = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth).catch(() => 0);
        if (status >= 400 || status === 0) bad.push(`${who} ${name} ${key} -> ${status}`);
        else if (overflow > 1) bad.push(`${who} ${name} ${key} scrolls sideways by ${overflow}px`);
        if (errors.length) bad.push(`${who} ${name} ${key} error: ${errors[0]}`);
        if (name === "phone" && status < 400) {
          // Every control must have a name a screen reader can say, and every picture an alt text.
          const unnamed = await pg.evaluate(() => {
            const visible = (el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none"; };
            const nameOf = (el) => {
              if (el.getAttribute("aria-label")) return true;
              if (el.getAttribute("aria-labelledby")) return true;
              if ((el.textContent || "").trim()) return true;
              if (el.getAttribute("title")) return true;
              if (el.querySelector("img[alt]:not([alt=''])")) return true;
              if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return true;
              if (el.closest("label")) return true;
              return false;
            };
            const out = [];
            for (const el of document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea")) {
              if (!visible(el) || el.closest("next-route-announcer")) continue;
              const tag = el.tagName.toLowerCase();
              const ok = tag === "input" && ["submit", "button"].includes(el.type) ? Boolean(el.value) : nameOf(el) || (["input", "textarea"].includes(tag) && Boolean(el.getAttribute("placeholder")));
              if (!ok) out.push(`${tag}${el.className ? "." + String(el.className).split(" ")[0] : ""}`);
            }
            for (const img of document.querySelectorAll("img")) if (visible(img) && !img.hasAttribute("alt")) out.push("img without alt");
            return out.slice(0, 3);
          }).catch(() => []);
          if (unnamed.length) bad.push(`${who} ${key} has controls without a name: ${unnamed.join(", ")}`);
        }
        if (name === "phone" && status < 400) {
          const hrefs = await pg.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href")));
          for (const href of hrefs) if (href && !seen.has(href.split("#")[0]) && !queue.includes(href)) queue.push(href);
        }
      }
    }
    return { pages: seen.size, bad };
  };
  const owner = await crawlAs(state.owner, "owner", ["/dashboard", "/more"], 140);
  ok(`crawl: owner reached ${owner.pages} pages, none broken, none scrolling sideways, no errors`, owner.bad.length === 0, owner.bad.slice(0, 12).join(" | "));
  if (state.emp) {
    const emp = await crawlAs(state.emp, "employee", ["/dashboard", "/more"], 60);
    ok(`crawl: employee reached ${emp.pages} pages, none broken, none scrolling sideways, no errors`, emp.bad.length === 0, emp.bad.slice(0, 12).join(" | "));
  }
  // The doors that need no login, on the three sizes
  if (state.supply) {
    const sup = await crawlAs(state.supply, "supply", ["/supply", "/supply/contractors"], 40);
    ok(`crawl: the supply account reached ${sup.pages} pages, none broken, none scrolling sideways, no errors`, sup.bad.length === 0, sup.bad.slice(0, 12).join(" | "));
  }
  const anon = await page(browser, 390, 844);
  const publicBad = [];
  const publicErrors = [];
  anon.on("pageerror", (e) => publicErrors.push(String(e.message).slice(0, 100)));
  const tokenPaths = (state.publicLinks || []).map((u) => u.replace(B, ""));
  for (const path of ["/", "/login", "/register", "/forgot-password", "/reset-password", "/this-page-does-not-exist", ...tokenPaths]) {
    for (const [w, h, name] of VIEWPORTS) {
      await anon.setViewportSize({ width: w, height: h });
      publicErrors.length = 0;
      const res = await anon.goto(B + path, { waitUntil: "networkidle" }).catch(() => null);
      const expected = 200;
      const unknownToLogin = path === "/this-page-does-not-exist" && anon.url().includes("/login");
      const overflow = await anon.evaluate(() => document.documentElement.scrollWidth - window.innerWidth).catch(() => 0);
      if (!res || (res.status() !== expected && !(res.status() === 404) && !unknownToLogin)) publicBad.push(`${name} ${path} -> ${res ? res.status() : 0}`);
      else if (overflow > 1) publicBad.push(`${name} ${path} scrolls sideways by ${overflow}px`);
      if (publicErrors.length) publicBad.push(`${name} ${path} error: ${publicErrors[0]}`);
    }
  }
  ok("crawl: the public pages (home, login, register, password, not found, supplier and customer links) answer on phone, tablet and desktop without errors or sideways scroll", publicBad.length === 0, publicBad.slice(0, 8).join(" | "));
  // Offline: the installed app shows its own page instead of the browser error
  const sw = await state.owner.evaluate(async () => { const r = await navigator.serviceWorker.ready; return Boolean(r.active); }).catch(() => false);
  ok("pwa: the service worker is active", sw);
  // (Playwright cannot cut the network for a service worker, so this checks that the offline page is stored and is the right one.)
  const offlineText = await state.owner.evaluate(async () => { const r = await caches.match("/offline.html"); return r ? await r.text() : ""; });
  ok("pwa: the friendly offline page is stored for when the network is down", /Sin conexión/.test(offlineText) && /You are offline/.test(offlineText) && /Sem conexão/.test(offlineText));
  const mani = await state.owner.request.get(B + "/manifest.json");
  const icons = (await mani.json()).icons;
  const iconStatus = await Promise.all(icons.map((i) => state.owner.request.get(B + i.src).then((r) => r.status())));
  ok("pwa: the manifest and all its icons load", mani.status() === 200 && iconStatus.every((s) => s === 200));
  await state.owner.setViewportSize({ width: 1300, height: 900 });
}

(async () => {
  const browser = await launch();
  try {
    state.owner = await page(browser);
    state.owner.on("dialog", (d) => d.accept());
    await register(state.owner, "Ana Owner", `owner-${RUN}@bidpower-smoke.test`, "Smoke Electric");
    state.projectId = await createProject(state.owner, "Miami Beach", "Cliente Miami");
    if (want("all") || want("3") || want("45")) await phase3(browser);
    if (want("all") || want("45")) await phase45(browser);
    if (want("all") || want("exp")) { if (!state.emp) state.emp = await inviteEmployee(browser, state.owner, "Luis Tester", `luis-${RUN}@bidpower-smoke.test`, "employee_basic", state.projectId); await phaseExpense(browser); }
    if (want("all") || want("6")) await phase6(browser);
    if (want("all") || want("78")) await phase78(browser);
    if (want("all") || want("9")) await phase9(browser);
    if (want("all") || want("10")) await phase10(browser);
    if (want("all") || want("lang")) await phaseLang(browser);
    if (want("all") || want("flow")) await phaseFlow(browser);
    if (want("all") || want("emp")) await phaseEmployee(browser);
    if (only === "all") await phaseCrawl(browser);
  } catch (e) {
    console.error("ERROR", e.message.split("\n").slice(0, 4).join(" | "));
    process.exitCode = 2;
  }
  await browser.close();
  console.log(failures() === 0 && !process.exitCode ? "\nALL CHECKS PASSED" : `\n${failures()} CHECK(S) FAILED`);
  process.exit(failures() === 0 && !process.exitCode ? 0 : process.exitCode || 1);
})();

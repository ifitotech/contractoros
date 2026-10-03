// Attacks the database directly (no app in between) with each kind of person, to prove that row security holds.
// Run after `node scripts/e2e/flows.js all` so there is data from several companies and roles:
//   node scripts/e2e/rls.js
const { spawnSync } = require("child_process");

function sql(input, db = "e2e") {
  const r = spawnSync("su", ["postgres", "-c", `psql -q -d ${db} -At -F '|' -v ON_ERROR_STOP=0`], { input, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}
const rows = (s) => s.out.split("\n").filter(Boolean).map((l) => l.split("|"));
let failed = 0;
let unreadable = 0;
const ok = (name, cond, extra) => { console.log((cond ? "PASS " : "FAIL ") + name + (!cond && extra ? "  -> " + extra : "")); if (!cond) failed++; };

// Run statements as a signed-in person (or anonymous) inside one transaction that is always rolled back.
function asUser(userId, statements, role = "authenticated") {
  const claims = userId ? JSON.stringify({ sub: userId, role }) : JSON.stringify({ role: "anon" });
  const body = Array.isArray(statements) ? statements.join("\n") : statements;
  const r = sql(`begin;\nset local role ${role};\nselect set_config('request.jwt.claims', '${claims}', true);\n${body}\nrollback;`);
  const n = lastNumber(r.out);
  if (Number.isNaN(n) && !/ERROR/.test(r.err)) unreadable++;
  return { ...r, n: Number.isNaN(n) ? 0 : n };
}


// The last whole number printed by a query ("-q" keeps command tags such as ROLLBACK out of the way).
function lastNumber(out) { const m = out.split("\n").filter((l) => /^-?\d+$/.test(l.trim())); return m.length ? Number(m[m.length - 1]) : NaN; }
function num(r) { const n = lastNumber(r.out); if (Number.isNaN(n)) throw new Error(`query returned no number: ${r.err || r.out}`); return n; }

const people = rows(sql(`select m.company_id, c.kind, m.user_id, m.role from company_members m join companies c on c.id=m.company_id where m.is_active order by m.created_at`)).map(([company, kind, user, role]) => ({ company, kind, user, role }));
const contractors = people.filter((p) => p.kind !== "supply");
const owners = contractors.filter((p) => p.role === "owner");
const A = owners[0];
const B = owners.find((p) => p.company !== A.company);
const employee = contractors.find((p) => p.company === A.company && p.role === "employee");
const supply = people.find((p) => p.kind === "supply");
if (!A || !B || !employee) { console.log("Not enough data: run `node scripts/e2e/flows.js all` first."); process.exit(2); }
console.log(`Companies: A=${A.company.slice(0, 8)} B=${B.company.slice(0, 8)}${supply ? ` supply=${supply.company.slice(0, 8)}` : ""}; employee=${employee.user.slice(0, 8)}\n`);

const tables = rows(sql(`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1`)).map((r) => r[0]);
const hasCol = (t, c) => rows(sql(`select 1 from information_schema.columns where table_schema='public' and table_name='${t}' and column_name='${c}'`)).length > 0;

// 1 + 2. Another company's rows are neither visible nor changeable, table by table.
// Tables that are shared on purpose (the two sides of a supply connection) are checked separately below.
const SHARED = new Set(["supply_quote_requests", "supply_quote_request_items", "supplier_quote_invitations", "supplier_quote_responses", "supplier_quote_response_items", "supplier_quote_attachments", "pricing_request_questions", "supply_connections", "supply_connect_codes", "companies", "profiles", "company_members", "plans", "plan_limits", "feedback"]);
let leaks = [];
let writes = [];
for (const t of tables) {
  if (!hasCol(t, "company_id") || SHARED.has(t)) continue;
  const foreign = rows(sql(`select id from ${t} where company_id <> '${A.company}' limit 50`)).map((r) => r[0]);
  if (foreign.length === 0) continue;
  const list = foreign.map((id) => `'${id}'`).join(",");
  const seen = Number(asUser(A.user, `select count(*) from ${t} where id in (${list});`).n);
  if (seen > 0) leaks.push(`${t} (${seen})`);
  const upd = asUser(A.user, `with u as (update ${t} set company_id = company_id where id in (${list}) returning 1) select count(*) from u;`).n;
  const del = asUser(A.user, `with d as (delete from ${t} where id in (${list}) returning 1) select count(*) from d;`).n;
  if (Number(upd || 0) > 0 || Number(del || 0) > 0) writes.push(`${t} (update ${upd}, delete ${del})`);
}
ok("another company's rows are never visible to an owner (every table with a company)", leaks.length === 0, leaks.join(", "));
ok("another company's rows can never be changed or deleted by an owner", writes.length === 0, writes.join(", "));

// Children without their own company column: reached only through their parent.
const CHILD = [["quote_items", "quote_id", "quotes"], ["invoice_items", "invoice_id", "invoices"], ["purchase_order_items", "purchase_order_id", "purchase_orders"], ["material_request_items", "request_id", "material_requests"], ["change_order_items", "change_order_id", "change_orders"]];
for (const [child, fk, parent] of CHILD) {
  if (!tables.includes(child) || !tables.includes(parent)) continue;
  if (!hasCol(parent, "company_id")) continue;
  const foreign = rows(sql(`select c.id from ${child} c join ${parent} p on p.id=c.${fk} where p.company_id <> '${A.company}' limit 50`)).map((r) => r[0]);
  if (foreign.length === 0) continue;
  const seen = Number(asUser(A.user, `select count(*) from ${child} where id in (${foreign.map((i) => `'${i}'`).join(",")});`).n);
  ok(`${child}: another company's lines are not visible`, seen === 0, String(seen));
}

// 3. Privilege escalation attempts (every statement must change nothing or fail).
const tryWrite = (user, stmt) => { const r = asUser(user, `with u as (${stmt} returning 1) select count(*) from u;`); return { changed: r.n > 0 && !/ERROR/.test(r.err), err: r.err }; };
ok("an employee cannot make themselves owner", !tryWrite(employee.user, `update company_members set role='owner' where user_id='${employee.user}'`).changed);
ok("an employee cannot rewrite their own permissions", !tryWrite(employee.user, `update member_permissions set can_view_costs = true where member_id in (select id from company_members where user_id='${employee.user}')`).changed);
ok("an employee cannot rename the company", !tryWrite(employee.user, `update companies set name='hacked' where id='${A.company}'`).changed);
ok("an employee cannot approve their own purchase order", !tryWrite(employee.user, `update purchase_orders set status='approved' where created_by='${employee.user}' and status='pending_approval'`).changed);
ok("an owner cannot add themselves to another company", !asUser(A.user, `insert into company_members(company_id,user_id,role) values ('${B.company}','${A.user}','owner');`).out.includes("INSERT") && /(violates|denied|policy)/i.test(asUser(A.user, `insert into company_members(company_id,user_id,role) values ('${B.company}','${A.user}','owner');`).err));
ok("an owner cannot move a project into another company", !tryWrite(A.user, `update projects set company_id='${B.company}' where company_id='${A.company}'`).changed);
ok("an owner cannot read another company's profile data beyond its members", Number(asUser(A.user, `select count(*) from profiles where id not in (select user_id from company_members where company_id='${A.company}') and id in (select user_id from company_members where company_id='${B.company}');`).n) === 0);

// 4. What an employee must not see (money and customers), compared with what an owner sees.
const MONEY = ["quotes", "quote_items", "invoices", "invoice_items", "change_orders", "accounting_export_log", "customer_links", "customer_actions"];
const employeeSees = [];
for (const t of MONEY) {
  if (!tables.includes(t)) continue;
  const ownerSees = Number(asUser(A.user, `select count(*) from ${t};`).n);
  const empSees = Number(asUser(employee.user, `select count(*) from ${t};`).n);
  if (ownerSees > 0 && empSees > 0) employeeSees.push(`${t} (${empSees}/${ownerSees})`);
}
ok("an employee without the right does not see money documents or customers", employeeSees.length === 0, employeeSees.join(", "));
const others = Number(asUser(employee.user, `select count(*) from purchase_orders where created_by <> '${employee.user}';`).n);
const ownerPOs = Number(asUser(A.user, `select count(*) from purchase_orders where created_by <> '${employee.user}';`).n);
ok("an employee sees only their own purchase orders", others === 0 || ownerPOs === 0, `${others} of others visible`);
const otherExp = Number(asUser(employee.user, `select count(*) from expenses where created_by <> '${employee.user}';`).n);
ok("an employee sees only their own expenses", otherExp === 0, String(otherExp));


// 4b. The server-side functions that take a company or object id: another company's ids must be refused.
const one = (q) => sql(q).out.split("\n")[0] || "";
const bQuote = one(`select id from quotes where company_id='${B.company}' limit 1`);
const bPO = one(`select id from purchase_orders where company_id='${B.company}' limit 1`);
const bMember = one(`select id from company_members where company_id='${B.company}' and role<>'owner' limit 1`) || one(`select id from company_members where company_id='${B.company}' limit 1`);
const aMember = one(`select id from company_members where company_id='${A.company}' and role='employee' limit 1`);
const refused = (user, call) => { const r = asUser(user, `select ${call};`); return /ERROR/.test(r.err) || r.out.trim() === "" || /^(f|false|0)$/i.test(r.out.trim()); };
const attacks = [
  ["create a team invitation in another company", `create_member_invitation('${B.company}', 'x@y.test', 'X', 'employee', 'employee_basic')`],
  ["read another company's supply inbox", `count(*) from supply_inbox('${B.company}')`],
  ["generate a supply connect code for another company", `create_supply_connect_code('${B.company}', 'x')`],
  ["take a number from another company's counter", `next_invoice_number('${B.company}')`],
  ["take a purchase order number from another company", `next_purchase_order_number('${B.company}')`],
];
if (bQuote) attacks.push(["version another company's proposal", `new_proposal_version('${bQuote}')`]);
if (bPO) attacks.push(["complete another company's purchase order", `complete_purchase_order('${bPO}', 1, 0)`]);
if (bMember) attacks.push(["deactivate a member of another company", `set_member_active('${bMember}', false)`]);
const slipped = [];
for (const [name, call] of attacks) {
  const r = asUser(A.user, `select ${call};`);
  const failedAsExpected = /ERROR/.test(r.err) || r.out.trim() === "" || /^0$/.test(r.out.trim());
  if (!failedAsExpected) slipped.push(`${name} -> ${r.out.slice(0, 40)}`);
}
ok("functions refuse another company's ids (invitations, supply, numbers, proposals, purchase orders, members)", slipped.length === 0, slipped.join(" | "));
const stillActive = one(`select is_active from company_members where id='${bMember}'`);
ok("another company's member is still active after the attempt", !bMember || stillActive === "t");

// A customer with no project of the employee's is invisible to them; the owner still sees it.
sql(`insert into clients(company_id, name) values ('${A.company}', 'RLS-Hidden-Client')`);
const hiddenForEmployee = asUser(employee.user, `select count(*) from clients where name='RLS-Hidden-Client';`).n;
const visibleForOwner = asUser(A.user, `select count(*) from clients where name='RLS-Hidden-Client';`).n;
sql(`delete from clients where name='RLS-Hidden-Client'`);
ok("an employee does not see customers of projects they are not on", hiddenForEmployee === 0 && visibleForOwner === 1, `employee ${hiddenForEmployee}, owner ${visibleForOwner}`);

// 5. Not signed in: nothing at all (the price list is public on purpose).
const anonSees = [];
for (const t of tables.filter((x) => !["plans", "plan_limits"].includes(x))) {
  const r = asUser(null, `select count(*) from ${t};`, "anon");
  const n = Number(r.n);
  if (n > 0 && !/ERROR/.test(r.err)) anonSees.push(`${t} (${n})`);
}
ok("a visitor who is not signed in can read no table", anonSees.length === 0, anonSees.join(", "));
const fnRows = rows(sql(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute') order by 1`)).map((r) => r[0]);
const EXPECTED_PUBLIC = /^(customer_|supplier_|get_invitation|invitation_|preview_invitation)/;
const unexpected = fnRows.filter((f) => !EXPECTED_PUBLIC.test(f));
ok("only the link-by-token functions can be called without signing in", unexpected.length === 0, unexpected.join(", "));
console.log(`   (public functions: ${fnRows.join(", ")})`);

// 6. A supply house sees its requests and nothing of the contractor's business.
if (supply) {
  const bad = [];
  for (const t of ["projects", "clients", "quotes", "invoices", "purchase_orders", "expenses", "company_materials", "material_requests", "member_permissions"]) {
    if (!tables.includes(t)) continue;
    const other = hasCol(t, "company_id") ? ` where company_id <> '${supply.company}'` : "";
    const n = Number(asUser(supply.user, `select count(*) from ${t}${other};`).n);
    if (n > 0) bad.push(`${t} (${n})`);
  }
  ok("a supply account sees none of a contractor's projects, customers, money or team", bad.length === 0, bad.join(", "));
  const projNames = Number(asUser(supply.user, `select count(*) from supply_quote_requests where project_id is not null;`).n);
  console.log(`   (supply sees ${projNames} requests that carry a project id; the screens must hide the project name)`);
}

ok("every query in this script answered with a number (nothing passed by silence)", unreadable === 0, `${unreadable} unreadable`);
console.log(failed === 0 ? "\nALL RLS CHECKS PASSED" : `\n${failed} RLS CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);

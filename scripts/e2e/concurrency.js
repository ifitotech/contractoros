// Many people creating documents at the same moment must never get the same number.
// Each call below runs in its own database session, so they really do overlap.
//   node scripts/e2e/concurrency.js
const { spawn, spawnSync } = require("child_process");

const psql = (input) => spawnSync("su", ["postgres", "-c", "psql -d e2e -At"], { input, encoding: "utf8" }).stdout.trim();
const owner = psql(`select m.company_id || '|' || m.user_id from company_members m where m.role='owner' and m.is_active order by m.created_at limit 1`).split("|");
if (owner.length !== 2) { console.log("Run `node scripts/e2e/flows.js all` first."); process.exit(2); }
const [company, user] = owner;
let failed = 0;
const ok = (name, cond, extra) => { console.log((cond ? "PASS " : "FAIL ") + name + (!cond && extra ? "  -> " + extra : "")); if (!cond) failed++; };

function call(fn) {
  return new Promise((resolve) => {
    const p = spawn("su", ["postgres", "-c", "psql -d e2e -At"]);
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stdin.write(`begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"${user}","role":"authenticated"}', true); select ${fn}('${company}'); commit;\n`);
    p.stdin.end();
    p.on("close", () => resolve(out.split("\n").filter((l) => /^[A-Z]{2,3}-/.test(l)).pop()));
  });
}

(async () => {
  for (const fn of ["next_invoice_number", "next_purchase_order_number", "next_material_request_number", "next_pricing_request_number", "next_quote_number"]) {
    const results = await Promise.all(Array.from({ length: 16 }, () => call(fn)));
    const distinct = new Set(results.filter(Boolean));
    ok(`${fn}: 16 simultaneous calls give 16 different numbers`, distinct.size === 16, `${distinct.size} distinct of ${results.length}: ${results.join(" ")}`);
  }
  // Payments added at the same moment must all count (none lost to a read-then-write race).
  const invoice = psql(`select id from invoices where company_id='${company}' and status <> 'cancelled' order by created_at desc limit 1`);
  if (invoice) {
    psql(`update invoices set amount_paid=0, status='sent', total=greatest(total,1000) where id='${invoice}'`);
    await Promise.all(Array.from({ length: 10 }, () => new Promise((resolve) => {
      const p = spawn("su", ["postgres", "-c", "psql -d e2e -At"]);
      p.stdin.write(`begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"${user}","role":"authenticated"}', true); select record_invoice_payment('${invoice}', 10); commit;\n`);
      p.stdin.end(); p.on("close", resolve);
    })));
    const paid = Number(psql(`select amount_paid from invoices where id='${invoice}'`));
    ok("10 payments of 10 at the same moment add up to exactly 100", paid === 100, String(paid));
    const refused = spawnSync("su", ["postgres", "-c", "psql -d e2e -At"], { input: `begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"${user}","role":"authenticated"}', true); select record_invoice_payment('${invoice}', -5); rollback;`, encoding: "utf8" });
    ok("a negative payment is refused", /invalid_amount/.test(refused.stderr || ""), refused.stderr);
  }
  console.log(failed === 0 ? "\nALL CONCURRENCY CHECKS PASSED" : `\n${failed} CONCURRENCY CHECK(S) FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();

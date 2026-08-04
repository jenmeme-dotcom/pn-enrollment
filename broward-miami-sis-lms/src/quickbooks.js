const crypto = require("node:crypto");

const AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
const API_BASE = "https://quickbooks.api.intuit.com/v3/company";
const SCOPES = "com.intuit.quickbooks.accounting";

function configuration() {
  return {
    clientId: String(process.env.QUICKBOOKS_CLIENT_ID || "").trim(),
    clientSecret: String(process.env.QUICKBOOKS_CLIENT_SECRET || "").trim(),
    redirectUri: String(process.env.QUICKBOOKS_REDIRECT_URI || `${String(process.env.PUBLIC_APP_URL || "http://localhost:4321").replace(/\/+$/, "")}/admin/integrations/quickbooks/callback`).trim()
  };
}

function isConfigured() {
  const config = configuration();
  return Boolean(config.clientId && config.clientSecret && process.env.SESSION_SECRET);
}

function encryptionKey() {
  return crypto.createHash("sha256").update(`bmhi-quickbooks:${process.env.SESSION_SECRET || "local-development-secret-change-me"}`).digest();
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function decrypt(value) {
  const [iv, tag, encrypted] = String(value || "").split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function authorizationUrl(state) {
  const config = configuration();
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    scope: SCOPES,
    redirect_uri: config.redirectUri,
    state
  });
  return `${AUTH_URL}?${params}`;
}

async function tokenRequest(parameters) {
  const config = configuration();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(parameters)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error_description || payload.error || `QuickBooks authorization failed (${response.status}).`);
  return payload;
}

function saveTokens(db, { realmId, tokens, userId, companyName = null }) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO quickbooks_connections (
      id, realm_id, company_name, access_token_encrypted, refresh_token_encrypted,
      access_token_expires_at, refresh_token_expires_at, connected_by, connected_at, updated_at, last_error
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
    ON CONFLICT(id) DO UPDATE SET
      realm_id = excluded.realm_id,
      company_name = COALESCE(excluded.company_name, quickbooks_connections.company_name),
      access_token_encrypted = excluded.access_token_encrypted,
      refresh_token_encrypted = excluded.refresh_token_encrypted,
      access_token_expires_at = excluded.access_token_expires_at,
      refresh_token_expires_at = excluded.refresh_token_expires_at,
      connected_by = excluded.connected_by,
      connected_at = excluded.connected_at,
      updated_at = CURRENT_TIMESTAMP,
      last_error = NULL
  `).run(
    String(realmId), companyName, encrypt(tokens.access_token), encrypt(tokens.refresh_token),
    new Date(now + Number(tokens.expires_in || 3600) * 1000).toISOString(),
    new Date(now + Number(tokens.x_refresh_token_expires_in || 8640000) * 1000).toISOString(),
    Number(userId) || null
  );
}

async function exchangeAuthorizationCode(db, { code, realmId, userId }) {
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: configuration().redirectUri
  });
  saveTokens(db, { realmId, tokens, userId });
  const company = await apiRequest(db, "GET", `companyinfo/${encodeURIComponent(String(realmId))}`, String(realmId));
  const companyName = company?.CompanyInfo?.CompanyName || company?.CompanyInfo?.LegalName || null;
  if (companyName) db.prepare("UPDATE quickbooks_connections SET company_name = ? WHERE id = 1").run(companyName);
  return companyName;
}

function connection(db) {
  return db.prepare(`
    SELECT id, realm_id, company_name, access_token_expires_at, refresh_token_expires_at,
      connected_by, connected_at, last_synced_at, last_error, updated_at
    FROM quickbooks_connections WHERE id = 1
  `).get();
}

async function accessToken(db) {
  const row = db.prepare("SELECT * FROM quickbooks_connections WHERE id = 1").get();
  if (!row) throw new Error("QuickBooks is not connected.");
  if (new Date(row.access_token_expires_at).getTime() > Date.now() + 120000) return decrypt(row.access_token_encrypted);
  const tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: decrypt(row.refresh_token_encrypted) });
  saveTokens(db, { realmId: row.realm_id, tokens, userId: row.connected_by, companyName: row.company_name });
  return tokens.access_token;
}

async function apiRequest(db, method, resource, realmId, body) {
  const token = await accessToken(db);
  const separator = resource.includes("?") ? "&" : "?";
  const response = await fetch(`${API_BASE}/${encodeURIComponent(realmId)}/${resource}${separator}minorversion=75`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.Fault) {
    const detail = payload?.Fault?.Error?.[0]?.Detail || payload?.Fault?.Error?.[0]?.Message;
    throw new Error(detail || `QuickBooks API request failed (${response.status}).`);
  }
  return payload;
}

function qboQuery(db, realmId, query) {
  return apiRequest(db, "GET", `query?query=${encodeURIComponent(query)}`, realmId);
}

function linkedId(db, localType, localId, quickbooksType) {
  return db.prepare(`SELECT quickbooks_id FROM quickbooks_entity_links WHERE local_type = ? AND local_id = ? AND quickbooks_type = ?`).get(localType, localId, quickbooksType)?.quickbooks_id;
}

function saveLink(db, localType, localId, quickbooksType, quickbooksId) {
  db.prepare(`
    INSERT INTO quickbooks_entity_links (local_type, local_id, quickbooks_type, quickbooks_id, sync_status, last_error, last_synced_at, updated_at)
    VALUES (?, ?, ?, ?, 'synced', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(local_type, local_id, quickbooks_type) DO UPDATE SET
      quickbooks_id = excluded.quickbooks_id, sync_status = 'synced', last_error = NULL,
      last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
  `).run(localType, localId, quickbooksType, String(quickbooksId));
}

function sqlText(value) {
  return String(value || "").replace(/'/g, "''");
}

async function ensureCustomer(db, realmId, user) {
  const existing = linkedId(db, "user", user.id, "Customer");
  if (existing) return existing;
  const displayName = `${user.first_name} ${user.last_name} (BMHI ${user.id})`;
  const query = await qboQuery(db, realmId, `select * from Customer where DisplayName = '${sqlText(displayName)}' maxresults 1`);
  let customer = query?.QueryResponse?.Customer?.[0];
  if (!customer) {
    const created = await apiRequest(db, "POST", "customer", realmId, {
      DisplayName: displayName,
      GivenName: user.first_name,
      FamilyName: user.last_name,
      PrimaryEmailAddr: { Address: user.email },
      ...(user.phone ? { PrimaryPhone: { FreeFormNumber: user.phone } } : {})
    });
    customer = created.Customer;
  }
  saveLink(db, "user", user.id, "Customer", customer.Id);
  return customer.Id;
}

async function ensureServiceItem(db, realmId) {
  const existing = linkedId(db, "system", 1, "Item");
  if (existing) return existing;
  const query = await qboQuery(db, realmId, "select * from Item where Name = 'BMHI Tuition and Fees' maxresults 1");
  let item = query?.QueryResponse?.Item?.[0];
  if (!item) {
    const accountQuery = await qboQuery(db, realmId, "select * from Account where AccountType = 'Income' and Active = true maxresults 1");
    const account = accountQuery?.QueryResponse?.Account?.[0];
    if (!account) throw new Error("QuickBooks needs an active income account before LMS charges can sync.");
    item = (await apiRequest(db, "POST", "item", realmId, {
      Name: "BMHI Tuition and Fees",
      Type: "Service",
      IncomeAccountRef: { value: account.Id }
    })).Item;
  }
  saveLink(db, "system", 1, "Item", item.Id);
  return item.Id;
}

async function syncCharges(db, realmId) {
  const rows = db.prepare(`
    SELECT c.*, u.first_name, u.last_name, u.email, u.phone
    FROM billing_charges c JOIN users u ON u.id = c.user_id
    WHERE c.status = 'posted' AND NOT EXISTS (
      SELECT 1 FROM quickbooks_entity_links l WHERE l.local_type = 'billing_charge' AND l.local_id = c.id AND l.quickbooks_type = 'Invoice'
    ) ORDER BY c.id
  `).all();
  if (!rows.length) return 0;
  const itemId = await ensureServiceItem(db, realmId);
  for (const row of rows) {
    const customerId = await ensureCustomer(db, realmId, row);
    const payload = {
      CustomerRef: { value: customerId },
      TxnDate: String(row.created_at || "").slice(0, 10),
      DueDate: row.due_date || undefined,
      PrivateNote: `BMHI LMS charge ${row.id} · ${row.term}`,
      Line: [{
        Amount: Number(row.amount_cents) / 100,
        Description: `${row.category}: ${row.description}`,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: { ItemRef: { value: itemId }, Qty: 1, UnitPrice: Number(row.amount_cents) / 100 }
      }]
    };
    const result = await apiRequest(db, "POST", "invoice", realmId, payload);
    saveLink(db, "billing_charge", row.id, "Invoice", result.Invoice.Id);
  }
  return rows.length;
}

async function syncPayments(db, realmId) {
  const rows = db.prepare(`
    SELECT p.*, u.first_name, u.last_name, u.email, u.phone
    FROM billing_payments p JOIN users u ON u.id = p.user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM quickbooks_entity_links l WHERE l.local_type = 'billing_payment' AND l.local_id = p.id AND l.quickbooks_type = 'Payment'
    ) ORDER BY p.id
  `).all();
  for (const row of rows) {
    const customerId = await ensureCustomer(db, realmId, row);
    const invoiceResult = await qboQuery(db, realmId, `select * from Invoice where CustomerRef = '${sqlText(customerId)}' maxresults 1000`);
    const openInvoices = (invoiceResult?.QueryResponse?.Invoice || [])
      .filter((invoice) => Number(invoice.Balance || 0) > 0)
      .sort((left, right) => String(left.DueDate || left.TxnDate || "").localeCompare(String(right.DueDate || right.TxnDate || "")));
    let remaining = Number(row.amount_cents) / 100;
    const lines = [];
    for (const invoice of openInvoices) {
      if (remaining <= 0) break;
      const amount = Math.min(remaining, Number(invoice.Balance || 0));
      lines.push({ Amount: amount, LinkedTxn: [{ TxnId: invoice.Id, TxnType: "Invoice" }] });
      remaining = Math.round((remaining - amount) * 100) / 100;
    }
    const payload = {
      CustomerRef: { value: customerId },
      TotalAmt: Number(row.amount_cents) / 100,
      TxnDate: row.paid_at,
      PrivateNote: `BMHI LMS payment ${row.id} · ${row.source} · ${row.applied_to}`,
      ...(lines.length ? { Line: lines } : {})
    };
    const result = await apiRequest(db, "POST", "payment", realmId, payload);
    saveLink(db, "billing_payment", row.id, "Payment", result.Payment.Id);
  }
  return rows.length;
}

async function importPayments(db, realmId) {
  const since = db.prepare("SELECT COALESCE(last_synced_at, '2000-01-01T00:00:00Z') AS since FROM quickbooks_connections WHERE id = 1").get().since;
  const result = await qboQuery(db, realmId, `select * from Payment where MetaData.LastUpdatedTime > '${sqlText(since)}' maxresults 1000`);
  const payments = result?.QueryResponse?.Payment || [];
  let imported = 0;
  for (const payment of payments) {
    const alreadyLinked = db.prepare("SELECT id FROM quickbooks_entity_links WHERE quickbooks_type = 'Payment' AND quickbooks_id = ?").get(String(payment.Id));
    if (alreadyLinked) continue;
    const customerId = String(payment.CustomerRef?.value || "");
    const userLink = db.prepare("SELECT local_id FROM quickbooks_entity_links WHERE local_type = 'user' AND quickbooks_type = 'Customer' AND quickbooks_id = ?").get(customerId);
    if (!userLink) continue;
    const insert = db.prepare(`
      INSERT INTO billing_payments (user_id, term, source, applied_to, amount_cents, paid_at, note)
      VALUES (?, 'QuickBooks import', 'QuickBooks payment', 'Account', ?, ?, ?)
    `).run(userLink.local_id, Math.round(Number(payment.TotalAmt || 0) * 100), payment.TxnDate || new Date().toISOString().slice(0, 10), `Imported from QuickBooks payment ${payment.Id}.`);
    saveLink(db, "billing_payment", insert.lastInsertRowid, "Payment", payment.Id);
    imported += 1;
  }
  return imported;
}

async function syncAll(db, userId) {
  const connected = connection(db);
  if (!connected) throw new Error("Connect QuickBooks before syncing.");
  const log = db.prepare("INSERT INTO quickbooks_sync_log (direction, action, status, started_by) VALUES ('two-way', 'full_sync', 'started', ?)").run(userId);
  try {
    const charges = await syncCharges(db, connected.realm_id);
    const payments = await syncPayments(db, connected.realm_id);
    const imported = await importPayments(db, connected.realm_id);
    const count = charges + payments + imported;
    const message = `${charges} charge(s), ${payments} LMS payment(s), and ${imported} QuickBooks payment(s) synchronized.`;
    db.prepare("UPDATE quickbooks_connections SET last_synced_at = CURRENT_TIMESTAMP, last_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = 1").run();
    db.prepare("UPDATE quickbooks_sync_log SET status = 'success', records_processed = ?, message = ? WHERE id = ?").run(count, message, log.lastInsertRowid);
    return { charges, payments, imported, count, message };
  } catch (error) {
    db.prepare("UPDATE quickbooks_connections SET last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1").run(error.message);
    db.prepare("UPDATE quickbooks_sync_log SET status = 'error', message = ? WHERE id = ?").run(error.message, log.lastInsertRowid);
    throw error;
  }
}

async function disconnect(db) {
  const row = db.prepare("SELECT refresh_token_encrypted FROM quickbooks_connections WHERE id = 1").get();
  if (row) {
    try {
      const config = configuration();
      await fetch(REVOKE_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token: decrypt(row.refresh_token_encrypted) })
      });
    } catch {}
  }
  db.prepare("DELETE FROM quickbooks_connections WHERE id = 1").run();
}

function verifyWebhookSignature(rawBody, signature) {
  const verifier = String(process.env.QUICKBOOKS_WEBHOOK_VERIFIER || "");
  if (!verifier || !signature) return false;
  const expected = crypto.createHmac("sha256", verifier).update(rawBody).digest("base64");
  const left = Buffer.from(expected);
  const right = Buffer.from(String(signature));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = {
  configuration,
  isConfigured,
  authorizationUrl,
  exchangeAuthorizationCode,
  connection,
  syncAll,
  disconnect,
  verifyWebhookSignature
};

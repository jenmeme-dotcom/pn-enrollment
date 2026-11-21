const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { DatabaseSync } = require('node:sqlite');

const projectRoot = path.resolve(__dirname, '..');
const cohort = 'Dashboard Contact Test A';
let directory, db, server, baseUrl, adminCookie, instructorCookie;
const studentIds = {};

async function reservePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const { port } = socket.address();
      socket.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function login(email, password) {
  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password, loginRole: 'faculty' })
  });
  assert.equal(response.status, 302);
  const cookie = (response.headers.getSetCookie?.()[0] || response.headers.get('set-cookie') || '').split(';', 1)[0];
  assert.match(cookie, /^bmhi\.sid=/);
  return cookie;
}

const get = (route, cookie = adminCookie) => fetch(`${baseUrl}${route}`, {
  headers: cookie ? { cookie } : {}, redirect: 'manual'
});
const post = (route, body, cookie = adminCookie) => fetch(`${baseUrl}${route}`, {
  method: 'POST', redirect: 'manual',
  headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(body)
});

function links(html) {
  return [...html.matchAll(/href="([^"]*)"/g)].map(match => match[1].replaceAll('&amp;', '&'));
}

function contactProfileIds(html) {
  return [...new Set(links(html).map(href => new URL(href, baseUrl).pathname.match(/^\/admin\/student-contacts\/(\d+)$/)?.[1]).filter(Boolean).map(Number))];
}

before(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bmhi-student-dashboard-'));
  const databaseFile = path.join(directory, 'dashboard.sqlite');
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await new Promise((resolve, reject) => {
    let output = '', ready = false;
    const timeout = setTimeout(() => reject(new Error(`Dashboard server did not start.\n${output}`)), 120_000);
    server = spawn(process.execPath, ['--no-warnings', path.join(projectRoot, 'src/server.js')], {
      cwd: directory,
      env: {
        PATH: process.env.PATH || '', NODE_PATH: process.env.NODE_PATH || '',
        NODE_ENV: 'test', DATABASE_FILE: databaseFile,
        PORT: String(port), PUBLIC_APP_URL: baseUrl,
        UPLOAD_DIR: path.join(directory, 'uploads'),
        SESSION_SECRET: 'synthetic-student-dashboard-test', EMAIL_DELIVERY_ENABLED: 'false'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const receive = chunk => {
      output += chunk.toString();
      if (ready || !output.includes('SIS/LMS running at')) return;
      ready = true; clearTimeout(timeout); resolve();
    };
    server.stdout.on('data', receive); server.stderr.on('data', receive);
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { if (!ready) { clearTimeout(timeout); reject(new Error(`Server exited ${code}.\n${output}`)); } });
  });
  db = new DatabaseSync(databaseFile);
  db.exec('PRAGMA busy_timeout = 5000');
  const hash = db.prepare("SELECT password_hash FROM users WHERE email='student@browardmiamihi.com'").get().password_hash;
  const insert = db.prepare(`INSERT INTO users
    (role, first_name, last_name, email, personal_email, phone, password_hash, status, cohort_name, organization_status)
    VALUES ('student',?,?,?,?,?,?,'active',?,'organized')`);
  studentIds.match = Number(insert.run('AvaContact', 'Mercer', 'ava-contact@example.test', 'ava-personal@example.test', '+19545550101', hash, cohort).lastInsertRowid);
  const photoName = 'dashboard-test-avatar.png';
  fs.mkdirSync(path.join(directory, 'uploads'), {recursive:true});
  fs.writeFileSync(path.join(directory, 'uploads', photoName), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+cvs8AAAAASUVORK5CYII=', 'base64'));
  db.prepare("UPDATE users SET photo_storage_name=?,photo_original_name=?,photo_review_status='approved' WHERE id=?").run(photoName, photoName, studentIds.match);
  studentIds.unmatched = Number(insert.run('NoahContact', 'Bennett', 'noah-contact@example.test', 'noah-contact@example.test', '', hash, cohort).lastInsertRowid);
  studentIds.otherCohort = Number(insert.run('AvaContact', 'Othercohort', 'ava-other@example.test', 'ava-other@example.test', '+19545550102', hash, 'Dashboard Contact Test B').lastInsertRowid);
  for (let n = 0; n < 12; n++) insert.run(`Pager${String(n).padStart(2,'0')}`, 'Dashboard', `dashboard-pager-${n}@example.test`, `dashboard-pager-${n}@example.test`, '+19545550103', hash, cohort);
  adminCookie = await login('admin@browardmiamihi.com', 'AdminPass123!');
  instructorCookie = await login('instructor@browardmiamihi.com', 'InstructorPass123!');
});

after(async () => {
  db?.close();
  if (server && server.exitCode === null) await new Promise(resolve => {
    server.once('exit', resolve); server.kill('SIGTERM'); setTimeout(resolve, 5000).unref();
  });
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
});

test('Operations contact search uses the selected cohort and retains it in its form', async () => {
  const response = await get(`/admin?cohort=${encodeURIComponent(cohort)}&contactQuery=AvaContact`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.deepEqual(contactProfileIds(html), [studentIds.match]);
  assert.match(html, new RegExp(`<h3><a href="/admin/students/${studentIds.match}/registrar-checklist">AvaContact Mercer</a></h3>`));
  assert.match(html, new RegExp(`href="/admin/students/${studentIds.match}/registrar-checklist">Open student file</a>`));
  assert.match(html, /name="contactQuery" value="AvaContact"/);
  assert.match(html, new RegExp(`type="hidden" name="cohort" value="${cohort}"`));
  assert.ok(links(html).some(href => decodeURIComponent(href) === 'mailto:ava-contact@example.test'));
  assert.match(html, /href="tel:\+19545550101"/);
});

test('Operations missing-phone filter and pagination stay scoped to the cohort', async () => {
  const html = await (await get(`/admin?cohort=${encodeURIComponent(cohort)}&contactPhone=missing`)).text();
  assert.deepEqual(contactProfileIds(html), [studentIds.unmatched]);
  const all = await (await get(`/admin?cohort=${encodeURIComponent(cohort)}`)).text();
  const nextHref = [...all.matchAll(/href="([^"]*contactPage=2[^"]*)"/g)].map(match => match[1].replaceAll('&amp;', '&'))[0];
  assert.ok(nextHref, 'Expected the 14-student cohort to paginate after 12 cards');
  const nextUrl = new URL(nextHref, baseUrl);
  assert.equal(nextUrl.pathname, '/admin');
  assert.equal(nextUrl.searchParams.get('cohort'), cohort);
  const nextHtml = await (await get(nextUrl.pathname + nextUrl.search)).text();
  assert.equal(contactProfileIds(nextHtml).length, 2);
  assert.ok(!contactProfileIds(nextHtml).includes(studentIds.otherCohort));
});

test('Operations keeps authentication and instructor redirection', async () => {
  const anonymous = await get('/admin', null);
  assert.equal(anonymous.status, 302);
  assert.match(anonymous.headers.get('location'), /^\/login/);
  const instructor = await get('/admin', instructorCookie);
  assert.equal(instructor.status, 302);
  assert.equal(instructor.headers.get('location'), '/admin/courses');
});

test('The student file shows the selected name, photo and contact details in its identity header', async () => {
  const response = await get(`/admin/students/${studentIds.match}/registrar-checklist`);
  assert.equal(response.status, 200);
  const html = await response.text();
  const header = html.slice(html.indexOf('<div class="page-head registrar-identity-header">'), html.indexOf('<section class="grid cols-4 registrar-stats">'));
  const nameAt = header.indexOf('<h1>AvaContact Mercer</h1>');
  const photoAt = header.indexOf(`/students/${studentIds.match}/photo`);
  const phoneAt = header.indexOf('href="tel:+19545550101"');
  assert.ok(nameAt >= 0 && photoAt > nameAt && phoneAt > photoAt, 'Identity header must lead with name, then photo and contact details');
  assert.ok(links(header).some(href => decodeURIComponent(href) === 'mailto:ava-personal@example.test'));
  assert.match(header, /Portal email/);
  assert.match(header, /ava-contact@example\.test/);
  assert.ok(links(header).includes(`/admin/student-contacts/${studentIds.match}`));
  const photo = await get(`/students/${studentIds.match}/photo`);
  assert.equal(photo.status, 200);
  assert.match(photo.headers.get('content-type'), /^image\/png/);
  const forbidden = await get(`/admin/students/${studentIds.match}/registrar-checklist`, instructorCookie);
  assert.equal(forbidden.status, 403);
});

test('The student file labels missing photo and phone without inventing contact details', async () => {
  const response = await get(`/admin/students/${studentIds.unmatched}/registrar-checklist`);
  assert.equal(response.status, 200);
  const html = await response.text();
  const header = html.slice(html.indexOf('<div class="page-head registrar-identity-header">'), html.indexOf('<section class="grid cols-4 registrar-stats">'));
  assert.match(header, /<h1>NoahContact Bennett<\/h1>/);
  assert.match(header, /No student photo on file for NoahContact Bennett/);
  assert.match(header, /<dt>Phone<\/dt><dd><span class="registrar-identity-notice">Not on file<\/span>/);
  assert.ok(!links(header).some(href => href.startsWith('tel:')));
  assert.ok(links(header).some(href => decodeURIComponent(href) === 'mailto:noah-contact@example.test'));
});

test('New student creation rejects missing or invalid phones before inserting any record', async () => {
  for (const [suffix, phone] of [['blank', ''], ['invalid', 'phone unavailable']]) {
    const email = `dashboard-phone-${suffix}@example.test`;
    const response = await post('/admin/students', { firstName:'Phone', lastName:'Validation', email, phone, organizationStatus:'organized' });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/admin/students');
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users WHERE email=?').get(email).count, 0);
    assert.match(await (await get('/admin/students')).text(), /Could not create student:.*phone/i);
  }
});

test('New student creation accepts and stores a validated contact phone', async () => {
  const email = 'dashboard-phone-valid@example.test';
  const response = await post('/admin/students', { firstName:'Valid', lastName:'Phone', email, phone:'(954) 555-0104', organizationStatus:'organized', cohortName:cohort });
  assert.equal(response.status, 302);
  const created = db.prepare('SELECT first_name,last_name,email,phone,cohort_name FROM users WHERE email=?').get(email);
  assert.ok(created);
  assert.equal(created.phone, '+19545550104');
  assert.equal(created.cohort_name, cohort);
  const html = await (await get(`/admin?cohort=${encodeURIComponent(cohort)}&contactQuery=${encodeURIComponent(email)}`)).text();
  assert.match(html, /href="tel:\+19545550104"/);
});

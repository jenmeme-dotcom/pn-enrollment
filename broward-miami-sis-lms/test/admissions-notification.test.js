const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");

let serverProcess;
let smtpServer;
let database;
let temporaryDirectory;
let baseUrl;
let smtpPort;
let waitForSmtpMessage;

function reservePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const { port } = socket.address();
      socket.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function startSmtpServer() {
  const messages = [];
  const pending = [];

  function record(message) {
    messages.push(message);
    while (pending.length) pending.shift()(message);
  }

  const server = net.createServer((socket) => {
    let buffer = "";
    let dataMode = false;
    let authLoginStep = "";
    let messageData = "";
    const recipients = [];

    socket.setEncoding("utf8");
    socket.write("220 localhost ESMTP\r\n");

    socket.on("data", (chunk) => {
      buffer += chunk;
      while (buffer.includes("\r\n")) {
        const index = buffer.indexOf("\r\n");
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);

        if (dataMode) {
          if (line === ".") {
            dataMode = false;
            record({ data: messageData, recipients: [...recipients] });
            messageData = "";
            socket.write("250 2.0.0 OK\r\n");
          } else {
            messageData += `${line}\n`;
          }
          continue;
        }

        const command = line.split(" ", 1)[0].toUpperCase();
        if (authLoginStep) {
          if (authLoginStep === "username") {
            authLoginStep = "password";
            socket.write("334 UGFzc3dvcmQ6\r\n");
          } else {
            authLoginStep = "";
            socket.write("235 2.7.0 Authentication successful\r\n");
          }
          continue;
        }

        if (command === "EHLO" || command === "HELO") {
          socket.write("250-localhost\r\n250-AUTH PLAIN LOGIN\r\n250 OK\r\n");
        } else if (command === "AUTH") {
          if (/^AUTH\s+LOGIN\s*$/i.test(line)) {
            authLoginStep = "username";
            socket.write("334 VXNlcm5hbWU6\r\n");
          } else {
            socket.write("235 2.7.0 Authentication successful\r\n");
          }
        } else if (command === "MAIL") {
          recipients.length = 0;
          socket.write("250 2.1.0 OK\r\n");
        } else if (command === "RCPT") {
          const match = line.match(/TO:\s*<([^>]+)>/i);
          if (match) recipients.push(match[1]);
          socket.write("250 2.1.5 OK\r\n");
        } else if (command === "DATA") {
          dataMode = true;
          socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
        } else if (command === "QUIT") {
          socket.write("221 2.0.0 Bye\r\n");
          socket.end();
        } else {
          socket.write("250 OK\r\n");
        }
      }
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        messages,
        port,
        server,
        waitForMessage(timeoutMs = 15000) {
          if (messages[0]) return Promise.resolve(messages[0]);
          return new Promise((messageResolve, messageReject) => {
            const timeout = setTimeout(() => messageReject(new Error("SMTP message was not received in time")), timeoutMs);
            pending.push((message) => {
              clearTimeout(timeout);
              messageResolve(message);
            });
          });
        }
      });
    });
  });
}

function startServer(port, databaseFile) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error(`Server did not start in time.\n${output}`));
    }, 120000);

    serverProcess = spawn(process.execPath, ["--no-warnings", "src/server.js"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        ADMISSIONS_NOTIFICATION_EMAIL: "admissions-office@example.test",
        DATABASE_FILE: databaseFile,
        EMAIL_DELIVERY_ENABLED: "true",
        NODE_ENV: "test",
        PORT: String(port),
        PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
        SESSION_SECRET: "admissions-notification-test-secret",
        SMTP_FROM: "portal@example.test",
        SMTP_HOST: "127.0.0.1",
        SMTP_PASS: "test-password",
        SMTP_PORT: String(smtpPort),
        SMTP_USER: "portal@example.test"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    const onOutput = (chunk) => {
      output += chunk.toString();
      if (!output.includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      resolve();
    };

    serverProcess.stdout.on("data", onOutput);
    serverProcess.stderr.on("data", onOutput);
    serverProcess.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    serverProcess.once("exit", (code, signal) => {
      if (output.includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      reject(new Error(`Server exited before startup (${code ?? signal}).\n${output}`));
    });
  });
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-admissions-notification-"));
  const smtp = await startSmtpServer();
  smtpServer = smtp.server;
  smtpPort = smtp.port;
  waitForSmtpMessage = smtp.waitForMessage;

  const databaseFile = path.join(temporaryDirectory, "admissions-notification.sqlite");
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile);

  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA busy_timeout = 5000;");
});

after(async () => {
  database?.close();
  if (serverProcess && serverProcess.exitCode === null) {
    await new Promise((resolve) => {
      serverProcess.once("exit", resolve);
      serverProcess.kill("SIGTERM");
      setTimeout(resolve, 5000).unref();
    });
  }
  await new Promise((resolve) => smtpServer?.close(resolve));
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
});

test("submitting an admissions application emails the admissions office", async () => {
  const course = database.prepare("SELECT slug FROM courses WHERE published = 1 ORDER BY id LIMIT 1").get();
  assert.ok(course, "Expected a published course for the admissions form");

  const response = await fetch(`${baseUrl}/admissions/apply`, {
    body: new URLSearchParams({
      address: "123 Sample Street",
      city: "Miramar",
      consent: "yes",
      educationLevel: "Some college",
      email: "new.applicant@example.test",
      emergencyContact: "Family Contact",
      emergencyPhone: "954-555-0101",
      firstName: "Nia",
      goals: "Interested in the practical nursing program.",
      highSchool: "Miami Dade College",
      howHeard: "Website",
      lastName: "Applicant",
      phone: "954-555-0199",
      preferredStart: "Cohort 2",
      programSlug: course.slug,
      state: "FL",
      zip: "33023"
    }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    redirect: "manual"
  });

  assert.equal(response.status, 302);
  const application = database.prepare("SELECT * FROM admission_applications WHERE email = ?").get("new.applicant@example.test");
  assert.ok(application, "Expected the admissions application to be stored");

  const message = await waitForSmtpMessage();
  assert.deepEqual(message.recipients, ["admissions-office@example.test"]);
  assert.match(message.data, /New admissions application: Nia Applicant/);
  assert.match(message.data, new RegExp(application.application_number));
  assert.match(message.data, /new\.applicant@example\.test/);
  assert.match(message.data, /Review the application|Review application in the admissions portal/);
});

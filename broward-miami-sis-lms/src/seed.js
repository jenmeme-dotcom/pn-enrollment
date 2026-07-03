require("dotenv").config({ quiet: true });
const { initialize, databaseFile } = require("./db");

initialize();
console.log(`BMHI SIS/LMS database is ready at ${databaseFile}`);

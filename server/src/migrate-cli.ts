import { initDatabase, closeDatabase } from "./init-db.js";

await initDatabase();
console.log("Migrations applied.");
await closeDatabase();

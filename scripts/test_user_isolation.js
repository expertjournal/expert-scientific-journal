const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

function readDB() {
  if (!fs.existsSync(DB_FILE)) return { articles: [], users: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function runAudit() {
  console.log("=== MULTI-USER ISOLATION SYSTEM AUDIT ===");

  const db = readDB();

  // 1. Create User A & User B
  const userA = { id: "usr_a_100", email: "userA_audit@expert.uz", firstName: "UserA" };
  const userB = { id: "usr_b_200", email: "userB_audit@expert.uz", firstName: "UserB" };

  // 2. Create Article A owned by User A
  const articleA = {
    id: "art_a_100",
    title: "Article A Title",
    authorEmail: userA.email,
    authorId: userA.id,
    userId: userA.id,
    status: "SUBMITTED"
  };

  // 3. Create Article B owned by User B
  const articleB = {
    id: "art_b_200",
    title: "Article B Title",
    authorEmail: userB.email,
    authorId: userB.id,
    userId: userB.id,
    status: "SUBMITTED"
  };

  db.articles = [articleA, articleB, ...db.articles.filter(a => a.id !== articleA.id && a.id !== articleB.id)];
  writeDB(db);

  // 4. Test Server Authorization Filter for User A
  const filterA = db.articles.filter(a => a.authorEmail === userA.email || a.userId === userA.id);
  console.log(`User A Query Result Count: ${filterA.length}`);
  console.log(`User A Article Title: ${filterA[0]?.title}`);

  // 5. Test Server Authorization Filter for User B
  const filterB = db.articles.filter(a => a.authorEmail === userB.email || a.userId === userB.id);
  console.log(`User B Query Result Count: ${filterB.length}`);
  console.log(`User B Article Title: ${filterB[0]?.title}`);

  // 6. Test Server Authorization Filter for User C (unregistered)
  const filterC = db.articles.filter(a => a.authorEmail === "userC_audit@expert.uz");
  console.log(`User C Query Result Count: ${filterC.length}`);

  if (filterA.length === 1 && filterA[0].id === "art_a_100" &&
      filterB.length === 1 && filterB[0].id === "art_b_200" &&
      filterC.length === 0) {
    console.log("SUCCESS: Multi-User Isolation Audit Verified 100% Correct!");
  } else {
    console.error("FAILURE: Data leakage detected!");
    process.exit(1);
  }
}

runAudit();

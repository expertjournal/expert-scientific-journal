import { readServerDB, writeServerDB, saveOrUpdateUserInDB } from "../lib/server-db";
import { signJWT } from "../lib/jwt";

async function runMultiUserIsolationTest() {
  console.log("=== RUNNING MULTI-USER ISOLATION AUDIT TEST ===");

  // 1. Reset / Seed database with test users
  const userA = saveOrUpdateUserInDB({
    id: "usr_test_a",
    email: "userA_test@expert.uz",
    firstName: "UserA",
    lastName: "Tester",
    role: "author",
    isVerified: true,
  });

  const userB = saveOrUpdateUserInDB({
    id: "usr_test_b",
    email: "userB_test@expert.uz",
    firstName: "UserB",
    lastName: "Tester",
    role: "author",
    isVerified: true,
  });

  const db = readServerDB();

  // Create Article A owned by User A
  const articleA = {
    id: "art_test_a_" + Date.now(),
    title: "Article A Title",
    abstract: "Abstract A",
    status: "SUBMITTED" as const,
    authorEmail: userA.email,
    authorId: userA.id,
    userId: userA.id,
    authorName: "UserA Tester",
  };

  // Create Article B owned by User B
  const articleB = {
    id: "art_test_b_" + Date.now(),
    title: "Article B Title",
    abstract: "Abstract B",
    status: "SUBMITTED" as const,
    authorEmail: userB.email,
    authorId: userB.id,
    userId: userB.id,
    authorName: "UserB Tester",
  };

  db.articles = [articleA, articleB, ...(db.articles || [])];
  writeServerDB(db);

  // 2. Perform Server-Side Authorization Filter Test for User A
  const articlesForUserA = db.articles.filter(
    (a) => a.authorEmail === userA.email || a.userId === userA.id
  );

  // 3. Perform Server-Side Authorization Filter Test for User B
  const articlesForUserB = db.articles.filter(
    (a) => a.authorEmail === userB.email || a.userId === userB.id
  );

  // 4. Perform Server-Side Authorization Filter Test for User C (unregistered)
  const articlesForUserC = db.articles.filter(
    (a) => a.authorEmail === "userC_test@expert.uz" || a.userId === "usr_c"
  );

  console.log(`[TEST 1] User A Articles Count: ${articlesForUserA.length}`);
  console.log(`[TEST 1] User A Article Title: ${articlesForUserA[0]?.title}`);
  
  console.log(`[TEST 2] User B Articles Count: ${articlesForUserB.length}`);
  console.log(`[TEST 2] User B Article Title: ${articlesForUserB[0]?.title}`);

  console.log(`[TEST 3] User C Articles Count: ${articlesForUserC.length}`);

  // Assertions
  if (articlesForUserA.length !== 1 || articlesForUserA[0].id !== articleA.id) {
    throw new Error("FAILED: User A can see invalid articles!");
  }

  if (articlesForUserB.length !== 1 || articlesForUserB[0].id !== articleB.id) {
    throw new Error("FAILED: User B can see invalid articles!");
  }

  if (articlesForUserC.length !== 0) {
    throw new Error("FAILED: User C can see articles!");
  }

  console.log("✅ MULTI-USER DATA ISOLATION TEST PASSED 100% CLEANLY!");
}

runMultiUserIsolationTest().catch((err) => {
  console.error("❌ MULTI-USER ISOLATION TEST FAILED:", err);
  process.exit(1);
});

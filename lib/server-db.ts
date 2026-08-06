import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

export interface DBData {
  articles: any[];
  issues: any[];
  messages: any[];
}

const DEFAULT_DATA: DBData = {
  articles: [],
  issues: [],
  messages: [],
};

export function readServerDB(): DBData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2), "utf-8");
      return DEFAULT_DATA;
    }
    const content = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(content);
    return {
      articles: Array.isArray(parsed.articles) ? parsed.articles : [],
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch (e) {
    console.error("Error reading server DB:", e);
    return DEFAULT_DATA;
  }
}

export function writeServerDB(data: DBData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing server DB:", e);
  }
}

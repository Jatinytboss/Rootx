import { MongoClient, type Collection, type Db, ObjectId } from "mongodb";

export type UserDoc = {
  _id: ObjectId;
  email: string;
  full_name: string;
  password_hash: string;
  created_at: Date;
};

export type MonitorDoc = {
  _id: ObjectId;
  user_id: string;
  name: string;
  url: string;
  interval_seconds: number;
  is_active: boolean;
  last_status: "up" | "down" | "preparing";
  last_response_ms: number | null;
  last_status_code: number | null;
  last_error: string | null;
  last_checked_at: Date | null;
  created_at: Date;
};

export type CheckDoc = {
  _id: ObjectId;
  monitor_id: string;
  user_id: string;
  status: "up" | "down";
  response_ms: number | null;
  status_code: number | null;
  error: string | null;
  checked_at: Date;
};

type MongoState = {
  client: MongoClient;
  db: Db;
  ready: Promise<void>;
};

// Reuse one connection across hot reloads / requests.
const globalRef = globalThis as typeof globalThis & { __uptimerMongo?: MongoState };

function connect(): MongoState {
  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to your .env / Render environment.");
  }
  const dbName = process.env["MONGODB_DB"] || "rootx_uptimer";

  const client = new MongoClient(uri, { retryWrites: true });
  const db = client.db(dbName);

  const ready = (async () => {
    await client.connect();
    await Promise.all([
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
      db.collection("monitors").createIndex({ user_id: 1, created_at: -1 }),
      db.collection("monitor_checks").createIndex({ monitor_id: 1, checked_at: -1 }),
      db.collection("monitor_checks").createIndex({ user_id: 1, checked_at: -1 }),
    ]);
  })();

  return { client, db, ready };
}

export async function getDb(): Promise<Db> {
  if (!globalRef.__uptimerMongo) globalRef.__uptimerMongo = connect();
  await globalRef.__uptimerMongo.ready;
  return globalRef.__uptimerMongo.db;
}

export async function collections() {
  const db = await getDb();
  return {
    db,
    users: db.collection("users") as unknown as Collection<UserDoc>,
    monitors: db.collection("monitors") as unknown as Collection<MonitorDoc>,
    checks: db.collection("monitor_checks") as unknown as Collection<CheckDoc>,
  };
}

export function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export { ObjectId };

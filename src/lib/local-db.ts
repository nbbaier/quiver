// import { type IDBPDatabase, openDB } from "idb";
// import type { Idea } from "./schema";

// const DB_NAME = "quiver-local";
// const DB_VERSION = 1;

// // We have two stores: one for ideas, one for pending changes
// export async function getDb() {
// 	return openDB(DB_NAME, DB_VERSION, {
// 		upgrade(db) {
// 			if (!db.objectStoreNames.contains("ideas")) {
// 				const store = db.createObjectStore("ideas", { keyPath: "id" });
// 				store.createIndex("createdAt", "createdAt");
// 			}
// 			if (!db.objectStoreNames.contains("pending")) {
// 				db.createObjectStore("pending", { keyPath: "id", autoIncrement: true });
// 			}
// 		},
// 	});
// }

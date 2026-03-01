import { browser } from '$app/environment';
import type { GeneratedSvg, ProjectRecord } from '$lib/domain/types';
import { MOCK_PROJECTS, createId, inferSuggestions, toDateStamp } from '$lib/data/mock';

const DB_NAME = 'primitive-svg-db';
const STORE_NAME = 'projects';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = () => {
	if (!browser) {
		throw new Error('IndexedDB is only available in the browser');
	}

	if (!dbPromise) {
		dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME, { keyPath: 'id' });
				}
			};
			request.onsuccess = () => resolve(request.result);
		});
	}

	return dbPromise;
};

const runTx = async <T>(
	mode: IDBTransactionMode,
	executor: (
		store: IDBObjectStore,
		resolve: (value: T | PromiseLike<T>) => void,
		reject: (reason?: unknown) => void
	) => void
) => {
	const db = await openDb();

	return new Promise<T>((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, mode);
		const store = tx.objectStore(STORE_NAME);
		executor(store, resolve, reject);
		tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
	});
};

const seedIfEmpty = async () => {
	const existing = await runTx<ProjectRecord[]>('readonly', (store, resolve, reject) => {
		const req = store.getAll();
		req.onsuccess = () => resolve((req.result as ProjectRecord[]) ?? []);
		req.onerror = () => reject(req.error);
	});

	if (existing.length > 0) {
		return;
	}

	const seeded: ProjectRecord[] = MOCK_PROJECTS.map((project) => {
		const suggested = inferSuggestions(project.name, project.desc);
		const selected = suggested.slice(0, 3);

		return {
			...project,
			suggestedIcons: suggested,
			selectedIcons: selected,
			generatedSVGs: []
		};
	});

	await runTx<void>('readwrite', (store, resolve, reject) => {
		for (const project of seeded) {
			store.put(project);
		}
		store.transaction.oncomplete = () => resolve();
		store.transaction.onerror = () => reject(store.transaction.error);
	});
};

const sortByUpdated = (projects: ProjectRecord[]) =>
	[...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const listProjects = async () => {
	if (!browser) {
		return [] as ProjectRecord[];
	}

	await seedIfEmpty();

	const projects = await runTx<ProjectRecord[]>('readonly', (store, resolve, reject) => {
		const req = store.getAll();
		req.onsuccess = () => resolve((req.result as ProjectRecord[]) ?? []);
		req.onerror = () => reject(req.error);
	});

	return sortByUpdated(projects);
};

export const getProjectById = async (id: string) => {
	if (!browser) {
		return null;
	}

	await seedIfEmpty();

	return runTx<ProjectRecord | null>('readonly', (store, resolve, reject) => {
		const req = store.get(id);
		req.onsuccess = () => resolve((req.result as ProjectRecord | undefined) ?? null);
		req.onerror = () => reject(req.error);
	});
};

interface PersistPayload {
	modelId: string;
	name: string;
	desc: string;
	suggestedIcons: string[];
	selectedIcons: string[];
	generatedSVGs: GeneratedSvg[];
}

const normalizePayload = (payload: PersistPayload): PersistPayload => ({
	name: payload.name,
	desc: payload.desc,
	modelId: payload.modelId,
	suggestedIcons: [...payload.suggestedIcons],
	selectedIcons: [...payload.selectedIcons],
	generatedSVGs: payload.generatedSVGs.map((svg) => ({
		id: svg.id,
		name: svg.name,
		code: svg.code,
		status: svg.status,
		variant: svg.variant,
		styleControls: {
			palette: [...svg.styleControls.palette],
			strokeWidth: svg.styleControls.strokeWidth
		},
		retryHistory: svg.retryHistory.map((entry) => ({ ...entry }))
	}))
});

const toProjectRecord = (
	id: string,
	payload: PersistPayload,
	createdAt?: string
): ProjectRecord => {
	const now = new Date().toISOString();
	const created = createdAt ?? now;

	return {
		id,
		modelId: payload.modelId,
		name: payload.name,
		desc: payload.desc,
		iconCount: payload.generatedSVGs.length || payload.selectedIcons.length,
		lastEdited: toDateStamp(now),
		createdAt: created,
		updatedAt: now,
		suggestedIcons: payload.suggestedIcons,
		selectedIcons: payload.selectedIcons,
		generatedSVGs: payload.generatedSVGs
	};
};

export const createProject = async (payload: PersistPayload) => {
	if (!browser) {
		throw new Error('Cannot create project during SSR');
	}

	const normalized = normalizePayload(payload);
	const id = createId();
	const record = toProjectRecord(id, normalized);

	await runTx<void>('readwrite', (store, resolve, reject) => {
		const req = store.add(record);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});

	return record;
};

export const updateProject = async (id: string, payload: PersistPayload) => {
	if (!browser) {
		throw new Error('Cannot update project during SSR');
	}

	const existing = await getProjectById(id);
	if (!existing) {
		throw new Error('Project not found');
	}

	const normalized = normalizePayload(payload);
	const record = toProjectRecord(id, normalized, existing.createdAt);

	await runTx<void>('readwrite', (store, resolve, reject) => {
		const req = store.put(record);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});

	return record;
};

export const deleteProject = async (id: string) => {
	if (!browser) {
		throw new Error('Cannot delete project during SSR');
	}

	await runTx<void>('readwrite', (store, resolve, reject) => {
		const req = store.delete(id);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
};

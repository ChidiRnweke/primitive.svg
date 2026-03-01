import { browser } from '$app/environment';
import type { ApiKeyStore } from '$lib/ai/interfaces';

const STORAGE_KEY = 'primitive-svg-openrouter-api-key';

let inMemoryApiKey: string | null = null;
let persisted = false;

const readPersistedKey = () => {
	if (!browser) {
		return null;
	}

	const key = window.localStorage.getItem(STORAGE_KEY);
	if (!key) {
		persisted = false;
		return null;
	}

	persisted = true;
	return key;
};

export const openRouterApiKeyStore: ApiKeyStore = {
	getKey() {
		if (inMemoryApiKey) {
			return inMemoryApiKey;
		}

		inMemoryApiKey = readPersistedKey();
		return inMemoryApiKey;
	},
	setKey(key, persist) {
		const normalized = key.trim();
		inMemoryApiKey = normalized.length > 0 ? normalized : null;
		persisted = Boolean(inMemoryApiKey) && persist;

		if (!browser) {
			return;
		}

		if (persisted && inMemoryApiKey) {
			window.localStorage.setItem(STORAGE_KEY, inMemoryApiKey);
			return;
		}

		window.localStorage.removeItem(STORAGE_KEY);
	},
	clear() {
		inMemoryApiKey = null;
		persisted = false;

		if (!browser) {
			return;
		}

		window.localStorage.removeItem(STORAGE_KEY);
	},
	isPersisted() {
		if (persisted) {
			return true;
		}

		if (!browser) {
			return false;
		}

		return window.localStorage.getItem(STORAGE_KEY) !== null;
	}
};

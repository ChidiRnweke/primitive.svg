import { openRouterApiKeyStore } from '$lib/ai/apiKeyStore';
import type { AiServices } from '$lib/ai/interfaces';
import { createOpenRouterAiServices } from '$lib/ai/openrouterServices';

const services: AiServices = createOpenRouterAiServices(openRouterApiKeyStore);

export const createAiServices = () => services;

export { openRouterApiKeyStore };

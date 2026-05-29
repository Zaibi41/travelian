import { TravelportAdapter } from "./travelport.mjs";
import { createAirSialAdapter, createFlyadealAdapter, createPiaAdapter } from "./direct-airline.mjs";

const allProviders = {
  travelport: new TravelportAdapter(),
  flyadeal: createFlyadealAdapter(),
  airsial: createAirSialAdapter(),
  pia: createPiaAdapter()
};

export function enabledProviders(requested) {
  const configured = (process.env.ENABLED_PROVIDERS || "travelport,flyadeal,airsial,pia")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const names = Array.isArray(requested) && requested.length ? requested : configured;
  return names.filter((name) => allProviders[name]).map((name) => allProviders[name]);
}

export function getProvider(name) {
  const provider = allProviders[name];
  if (!provider) {
    const error = new Error(`Unsupported provider: ${name}`);
    error.statusCode = 400;
    throw error;
  }
  return provider;
}

import { ProviderAdapter } from "./provider-base.mjs";

export class DirectAirlineAdapter extends ProviderAdapter {
  constructor(name, secretEnvName) {
    super(name);
    this.secretEnvName = secretEnvName;
  }
}

export const createFlyadealAdapter = () => new DirectAirlineAdapter("flyadeal", "FLYADEAL_SECRET_ID");
export const createAirSialAdapter = () => new DirectAirlineAdapter("airsial", "AIRSIAL_SECRET_ID");
export const createPiaAdapter = () => new DirectAirlineAdapter("pia", "PIA_SECRET_ID");

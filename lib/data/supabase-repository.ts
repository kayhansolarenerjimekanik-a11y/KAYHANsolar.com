import type { Repository } from "./repository";

const notImplemented = () => {
  throw new Error(
    "Supabase repository is not yet implemented. Set DATA_MODE=demo or configure Supabase keys.",
  );
};

export const supabaseRepository: Repository = new Proxy({} as Repository, {
  get() {
    return notImplemented;
  },
});

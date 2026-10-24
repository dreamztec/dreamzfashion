import { create } from "zustand";

interface SiteSettingsState {
  whatsappNumber: string;
  set: (settings: { whatsappNumber?: string }) => void;
}

/**
 * Client-side mirror of the site settings loaded by the root route.
 * Lets deep components (cart drawer, etc.) reach the centralized
 * WhatsApp number without prop-drilling through the tree.
 */
export const useSiteSettings = create<SiteSettingsState>()((set) => ({
  whatsappNumber: "",
  set: (settings) => set({ whatsappNumber: settings.whatsappNumber ?? "" }),
}));
import { HexclaveClientApp } from "@hexclave/next";

export const hexclaveClientApp = new HexclaveClientApp({
  tokenStore: "nextjs-cookie",
  urls: {
    default: {
      type: "hosted",
    },
    accountSettings: { type: "custom", url: "/account-settings", version: 1 },
    signUp: {
      type: "custom",
      url: "/sign-up",
      version: 1,
    },
    afterSignIn: "/workspace",
    afterSignUp: "/workspace",
    afterSignOut: "/",
    home: "/",
  },
  analytics: {
    // SDK click capture includes target.textContent even inside replay-blocked
    // subtrees. Disable automatic capture to protect unpublished manuscripts.
    enabled: false,
    replays: {
      maskAllInputs: true,
      blockSelector: ".hexclave-private",
    },
  },
});

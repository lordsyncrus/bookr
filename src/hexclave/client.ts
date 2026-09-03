import { HexclaveClientApp } from "@hexclave/next";

export const hexclaveClientApp = new HexclaveClientApp({
  tokenStore: "nextjs-cookie",
  urls: {
    default: {
      type: "hosted",
    },
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
    replays: {
      maskAllInputs: true,
      blockSelector: ".hexclave-private",
    },
  },
});

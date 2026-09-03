export const config = {
  "apps": {
    "installed": {
      "authentication": {
        "enabled": true
      },
      "rbac": {
        "enabled": true
      },
      "emails": {
        "enabled": true
      },
      "data-vault": {
        "enabled": true
      },
      "analytics": {
        "enabled": true
      }
    }
  },
  "auth": {
    "password": {
      "allowSignIn": true
    },
    "otp": {
      "allowSignIn": true
    },
    "passkey": {
      "allowSignIn": false
    },
    "oauth": {
      "providers": {}
    }
  },
  "emails": {
    "selectedThemeId": "a0172b5d-cff0-463b-83bb-85124697373a"
  }
};

export const ENVIRONMENT = {
  APP: {
    NAME: Bun.env.NAME,
    PORT: Bun.env.APP_PORT || Bun.env.PORT || 3000,
    ENV: Bun.env.NODE_ENV || "development",
    EMAIL: Bun.env.EMAIL,
    ENCRYPT: Bun.env.ENCRYPT,
    ENCRYPT_IV: Bun.env.ENCRYPT_IV,
  },
  REDIS: {
    MAIN: Bun.env.REDIS_URL,
    QUEUE: Bun.env.REDIS_QUEUE_URL,
    CAMPAIGN: Bun.env.REDIS_CAMPAIGN_URL,
  },
  DB: {
    URL: Bun.env.DB_URL,
  },
  JWT: {
    USER: {
      ACCESS_TOKEN_SECRET: Bun.env.JWT_USER_ACCESS_TOKEN_SECRET,
      ACCESS_TOKEN_EXPIRES_IN: Bun.env.JWT_USER_ACCESS_TOKEN_EXPIRES_IN,
      ACCESS_COOKIE_EXPIRES_IN: Bun.env.JWT_USER_ACCESS_COOKIE_EXPIRES_IN,
      ACCESS_TOKEN_NAME: Bun.env.JWT_USER_ACCESS_TOKEN_NAME,
      REFRESH_TOKEN_SECRET: Bun.env.JWT_USER_REFRESH_TOKEN_SECRET,
      REFRESH_TOKEN_EXPIRES_IN: Bun.env.JWT_USER_REFRESH_TOKEN_EXPIRES_IN,
      REFRESH_COOKIE_EXPIRES_IN: Bun.env.JWT_USER_REFRESH_COOKIE_EXPIRES_IN,
      REFRESH_TOKEN_NAME: Bun.env.JWT_USER_REFRESH_TOKEN_NAME,
    },
    MERCHANT: {
      ACCESS_TOKEN_SECRET: Bun.env.JWT_MERCHANT_ACCESS_TOKEN_SECRET,
      ACCESS_TOKEN_EXPIRES_IN: Bun.env.JWT_MERCHANT_ACCESS_TOKEN_EXPIRES_IN,
      ACCESS_COOKIE_EXPIRES_IN: Bun.env.JWT_MERCHANT_ACCESS_COOKIE_EXPIRES_IN,
      ACCESS_TOKEN_NAME: Bun.env.JWT_MERCHANT_ACCESS_TOKEN_NAME,
      REFRESH_TOKEN_SECRET: Bun.env.JWT_MERCHANT_REFRESH_TOKEN_SECRET,
      REFRESH_TOKEN_EXPIRES_IN: Bun.env.JWT_MERCHANT_REFRESH_TOKEN_EXPIRES_IN,
      REFRESH_COOKIE_EXPIRES_IN: Bun.env.JWT_MERCHANT_REFRESH_COOKIE_EXPIRES_IN,
      REFRESH_TOKEN_NAME: Bun.env.JWT_MERCHANT_REFRESH_TOKEN_NAME,
    },
    ADMIN: {
      ACCESS_TOKEN_SECRET: Bun.env.JWT_ADMIN_ACCESS_TOKEN_SECRET,
      ACCESS_TOKEN_EXPIRES_IN: Bun.env.JWT_ADMIN_ACCESS_TOKEN_EXPIRES_IN,
      ACCESS_COOKIE_EXPIRES_IN: Bun.env.JWT_ADMIN_ACCESS_COOKIE_EXPIRES_IN,
      ACCESS_TOKEN_NAME: Bun.env.JWT_ADMIN_ACCESS_TOKEN_NAME,
      REFRESH_TOKEN_SECRET: Bun.env.JWT_ADMIN_REFRESH_TOKEN_SECRET,
      REFRESH_TOKEN_EXPIRES_IN: Bun.env.JWT_ADMIN_REFRESH_TOKEN_EXPIRES_IN,
      REFRESH_COOKIE_EXPIRES_IN: Bun.env.JWT_ADMIN_REFRESH_COOKIE_EXPIRES_IN,
      REFRESH_TOKEN_NAME: Bun.env.JWT_ADMIN_REFRESH_TOKEN_NAME,
    },
  },
  ZEPTO: {
    SERVICE: Bun.env.ZEPTO_SERVICE,
    USERNAME: Bun.env.ZEPTO_USERNAME,
    PASSWORD: Bun.env.ZEPTO_PASSWORD,
  },
  VT_PASS: {
    URL: Bun.env.VT_PASS_URL,
    USERNAME: Bun.env.VT_PASS_USERNAME,
    PASSWORD: Bun.env.VT_PASS_PASSWORD,
  },
};

(() => {
  // recursively Check if all required environment variables are set
  for (const key in ENVIRONMENT) {
    if (typeof ENVIRONMENT[key as keyof typeof ENVIRONMENT] === "object") {
      checkObject(ENVIRONMENT[key as keyof typeof ENVIRONMENT], key);
    } else {
      if (ENVIRONMENT[key as keyof typeof ENVIRONMENT] === undefined) {
        throw new Error(`Environment variable ${key} is not set`);
      }
    }
  }

  function checkObject(obj: any, parentKey = "") {
    for (const key in obj) {
      const fullKey = parentKey ? `${parentKey} > ${key}` : key;

      if (typeof obj[key] === "object" && obj[key] !== null) {
        checkObject(obj[key], fullKey);
      } else if (obj[key] === undefined) {
        throw new Error(`Environment variable '${fullKey}' is not set`);
      }
    }
  }
})();

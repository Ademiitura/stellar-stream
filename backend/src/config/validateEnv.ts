import { z } from "zod";

/**
 * Validates Soroban-related environment variables at startup.
 * Fails fast with helpful messages if config is invalid.
 * Distinguishes between required and optional config.
 * Allows local non-chain development to run intentionally.
 */

// Stellar account ID format: 56 chars, starts with G (public) or C (contract)
const stellarAccountIdSchema = z
  .string()
  .length(56, "must be exactly 56 characters")
  .regex(/^[GC]/, "must start with G (account) or C (contract)");

// Stellar secret key format: 56 chars, starts with S
const stellarSecretKeySchema = z
  .string()
  .length(56, "must be exactly 56 characters")
  .regex(/^S/, "must start with S");

// URL validation
const urlSchema = z.string().url("must be a valid URL");

// Port validation
const portSchema = z
  .string()
  .transform((val: string) => parseInt(val, 10))
  .refine((val: number) => !isNaN(val) && val > 0 && val < 65536, {
    message: "must be a valid port number (1-65535)",
  });

// Environment config schema
const envSchema = z.object({
  PORT: portSchema.optional().default(3001),
  CONTRACT_ID: z.string().optional(),
  STELLAR_CONTRACT_ID: z.string().optional(),
  SERVER_PRIVATE_KEY: z.string().optional(),
  RPC_URL: z.string().optional().default("https://soroban-testnet.stellar.org:443"),
  SOROBAN_RPC_URL: z.string().optional(),
  NETWORK_PASSPHRASE: z
    .string()
    .optional()
    .default("Test SDF Network ; September 2015"),
  STELLAR_NETWORK: z.string().optional(),
  ALLOWED_ASSETS: z.string().optional().default("USDC,XLM"),
  DB_PATH: z.string().optional().default("backend/data/streams.db"),
  WEBHOOK_DESTINATION_URL: z.string().optional(),
  WEBHOOK_SIGNING_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  SERVER_SIGNING_KEY: z.string().optional(),
  DOMAIN: z.string().optional().default("localhost"),
  SOROBAN_DISABLED: z.string().optional(),
});

export interface ValidatedConfig {
  port: number;
  sorobanEnabled: boolean;
  contractId: string | null;
  serverPrivateKey: string | null;
  rpcUrl: string;
  networkPassphrase: string;
  allowedAssets: string[];
  dbPath: string;
  webhookDestinationUrl: string | null;
  webhookSigningSecret: string | null;
  jwtSecret: string;
  serverSigningKey: string | null;
  domain: string;
}

function getNetworkPassphrase(network: string | undefined): string {
  if (!network) return "Test SDF Network ; September 2015";
  const norm = network.toLowerCase().trim();
  if (norm === "testnet" || norm === "test sdf network ; september 2015") {
    return "Test SDF Network ; September 2015";
  }
  if (norm === "public" || norm === "mainnet" || norm === "public global stellar network ; october 2015") {
    return "Public Global Stellar Network ; October 2015";
  }
  return network;
}

export function validateEnv(): ValidatedConfig {
  // Support backwards compatibility: map old variables to new ones if new ones are not set
  if (!process.env.STELLAR_CONTRACT_ID && process.env.CONTRACT_ID) {
    process.env.STELLAR_CONTRACT_ID = process.env.CONTRACT_ID;
  }
  if (!process.env.SOROBAN_RPC_URL && process.env.RPC_URL) {
    process.env.SOROBAN_RPC_URL = process.env.RPC_URL;
  }
  if (!process.env.STELLAR_NETWORK && process.env.NETWORK_PASSPHRASE) {
    process.env.STELLAR_NETWORK = process.env.NETWORK_PASSPHRASE;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const sorobanDisabled = process.env.SOROBAN_DISABLED?.toLowerCase() === "true";

  if (!sorobanDisabled) {
    if (isProduction && (!process.env.SOROBAN_RPC_URL || !process.env.STELLAR_CONTRACT_ID || !process.env.STELLAR_NETWORK || !process.env.SERVER_PRIVATE_KEY)) {
      console.error(
        "❌ Soroban configuration incomplete. Either provide both CONTRACT_ID and SERVER_PRIVATE_KEY, or set SOROBAN_DISABLED=true for local development.\n"
      );
      console.error("   Required for on-chain operations:");
      console.error("   - CONTRACT_ID: Soroban contract ID (56 chars, starts with C)");
      console.error("   - SERVER_PRIVATE_KEY: Stellar secret key (56 chars, starts with S)\n");
      console.error("   Optional:");
      console.error("   - RPC_URL: Soroban RPC endpoint");
      console.error("   - NETWORK_PASSPHRASE: Stellar network passphrase\n");
      console.error("   To run locally without on-chain operations:");
      console.error("   - Set SOROBAN_DISABLED=true\n");
    }
    if (!process.env.SOROBAN_RPC_URL) {
      if (isProduction) {
        console.error("❌ SOROBAN_RPC_URL is required in production");
        process.exit(1);
      } else {
        console.warn("⚠️  SOROBAN_RPC_URL is missing in development. Defaulting to testnet: https://soroban-testnet.stellar.org:443");
        process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org:443";
      }
    }

    if (!process.env.STELLAR_CONTRACT_ID) {
      if (isProduction) {
        console.error("❌ STELLAR_CONTRACT_ID is required in production");
        process.exit(1);
      } else {
        console.warn("⚠️  STELLAR_CONTRACT_ID is missing in development. Defaulting to testnet: CCJW2RLIN4MQQ4DAJMMR3F5QPDA6QYTKXJMEVI3XOTDBTBCLBB553J74");
        process.env.STELLAR_CONTRACT_ID = "CCJW2RLIN4MQQ4DAJMMR3F5QPDA6QYTKXJMEVI3XOTDBTBCLBB553J74";
      }
    }

    if (!process.env.STELLAR_NETWORK) {
      if (isProduction) {
        console.error("❌ STELLAR_NETWORK is required in production");
        process.exit(1);
      } else {
        console.warn("⚠️  STELLAR_NETWORK is missing in development. Defaulting to testnet");
        process.env.STELLAR_NETWORK = "testnet";
      }
    }

    if (!process.env.SERVER_PRIVATE_KEY) {
      if (isProduction) {
        console.error("❌ SERVER_PRIVATE_KEY is required in production");
        process.exit(1);
      } else {
        console.warn("⚠️  SERVER_PRIVATE_KEY is missing in development");
      }
    }

    // Now validate their formats if present
    if (process.env.STELLAR_CONTRACT_ID) {
      const contractIdValidation = stellarAccountIdSchema.safeParse(process.env.STELLAR_CONTRACT_ID);
      if (!contractIdValidation.success) {
        console.error("❌ STELLAR_CONTRACT_ID validation failed:");
        contractIdValidation.error.issues.forEach((issue: z.ZodIssue) => {
          console.error(`   ${issue.message}`);
        });
        process.exit(1);
      }
    }

    if (process.env.SOROBAN_RPC_URL) {
      const rpcValidation = urlSchema.safeParse(process.env.SOROBAN_RPC_URL);
      if (!rpcValidation.success) {
        console.error("❌ SOROBAN_RPC_URL validation failed:");
        rpcValidation.error.issues.forEach((issue: z.ZodIssue) => {
          console.error(`   ${issue.message}`);
        });
        process.exit(1);
      }
    }

    if (process.env.SERVER_PRIVATE_KEY) {
      const keyValidation = stellarSecretKeySchema.safeParse(process.env.SERVER_PRIVATE_KEY);
      if (!keyValidation.success) {
        console.error("❌ SERVER_PRIVATE_KEY validation failed:");
        keyValidation.error.issues.forEach((issue: z.ZodIssue) => {
          console.error(`   ${issue.message}`);
        });
        process.exit(1);
      }
    }
  }

  // Populate back to the old environment variables for the rest of the application
  if (process.env.SOROBAN_RPC_URL) {
    process.env.RPC_URL = process.env.SOROBAN_RPC_URL;
  }
  if (process.env.STELLAR_CONTRACT_ID) {
    process.env.CONTRACT_ID = process.env.STELLAR_CONTRACT_ID;
  }
  if (process.env.STELLAR_NETWORK) {
    process.env.NETWORK_PASSPHRASE = getNetworkPassphrase(process.env.STELLAR_NETWORK);
  }

  // Parse environment variables
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Environment validation failed:");
    parsed.error.issues.forEach((issue: z.ZodIssue) => {
      const envVar = issue.path.join(".");
      console.error(`   ${envVar}: ${issue.message}`);
    });
    process.exit(1);
  }

  const env = parsed.data || {} as any;

  if (sorobanDisabled) {
    console.log("⚠️  Soroban disabled (SOROBAN_DISABLED=true) — local development mode");
  } else {
    console.log("✅ Soroban configuration validated");
  }

  // Validate optional webhook URL if provided
  if (env.WEBHOOK_DESTINATION_URL) {
    const webhookValidation = urlSchema.safeParse(env.WEBHOOK_DESTINATION_URL);
    if (!webhookValidation.success) {
      console.error("❌ WEBHOOK_DESTINATION_URL validation failed:");
      webhookValidation.error.issues.forEach((issue: z.ZodIssue) => {
        console.error(`   ${issue.message}`);
      });
      process.exit(1);
    }
  }

  // Validate webhook signing secret if webhook URL is set
  if (env.WEBHOOK_DESTINATION_URL && !env.WEBHOOK_SIGNING_SECRET) {
    console.warn(
      "⚠️  WEBHOOK_DESTINATION_URL is set but WEBHOOK_SIGNING_SECRET is not — webhooks will not be signed"
    );
  }

  // Parse allowed assets
  const allowedAssets = (env.ALLOWED_ASSETS || "")
    .split(",")
    .map((asset: string) => asset.trim().toUpperCase())
    .filter((asset: string) => asset.length > 0);

  if (allowedAssets.length === 0) {
    console.error("❌ ALLOWED_ASSETS must contain at least one asset code");
    process.exit(1);
  }

  console.log(`✅ Configuration validated (port: ${env.PORT || 3001}, assets: ${allowedAssets.join(", ")})`);

  return {
    port: env.PORT || 3001,
    sorobanEnabled: !sorobanDisabled,
    contractId: process.env.STELLAR_CONTRACT_ID || null,
    serverPrivateKey: process.env.SERVER_PRIVATE_KEY || null,
    rpcUrl: process.env.SOROBAN_RPC_URL || env.RPC_URL || "https://soroban-testnet.stellar.org:443",
    networkPassphrase: process.env.NETWORK_PASSPHRASE || env.NETWORK_PASSPHRASE || "Test SDF Network ; September 2015",
    allowedAssets,
    dbPath: env.DB_PATH || "backend/data/streams.db",
    webhookDestinationUrl: env.WEBHOOK_DESTINATION_URL || null,
    webhookSigningSecret: env.WEBHOOK_SIGNING_SECRET || null,
    jwtSecret: env.JWT_SECRET || "",
    serverSigningKey: env.SERVER_SIGNING_KEY || null,
    domain: env.DOMAIN || "localhost",
  };
}

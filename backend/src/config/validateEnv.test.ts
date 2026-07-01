import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { validateEnv } from "./validateEnv";

describe("validateEnv", () => {
  const originalEnv = process.env;
  const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  beforeEach(() => {
    process.env = { ...originalEnv };
    exitSpy.mockClear();
    consoleErrorSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleLogSpy.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Acceptance Criteria 1: Invalid config fails fast with helpful messages", () => {
    it("should exit with code 1 when CONTRACT_ID is missing and Soroban enabled", () => {
      process.env = {
        NODE_ENV: "production",
        SERVER_PRIVATE_KEY: "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
      };

      validateEnv();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("STELLAR_CONTRACT_ID is required in production")
      );
    });

    it("should exit with code 1 when SERVER_PRIVATE_KEY is missing and Soroban enabled", () => {
      process.env = {
        NODE_ENV: "production",
        CONTRACT_ID: "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
      };

      validateEnv();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("SERVER_PRIVATE_KEY is required in production")
      );
    });

    it("should exit with code 1 when CONTRACT_ID format is invalid", () => {
      process.env = {
        CONTRACT_ID: "INVALID_CONTRACT_ID",
        SERVER_PRIVATE_KEY: "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
      };

      validateEnv();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("STELLAR_CONTRACT_ID validation failed")
      );
    });

    it("should exit with code 1 when SERVER_PRIVATE_KEY format is invalid", () => {
      process.env = {
        CONTRACT_ID: "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
        SERVER_PRIVATE_KEY: "INVALID_KEY",
      };

      validateEnv();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("SERVER_PRIVATE_KEY validation failed")
      );
    });

    it("should exit with code 1 when RPC_URL is invalid", () => {
      process.env = {
        CONTRACT_ID: "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
        SERVER_PRIVATE_KEY: "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
        RPC_URL: "not-a-valid-url",
      };

      validateEnv();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("SOROBAN_RPC_URL validation failed")
      );
    });

    it("should provide helpful error message with suggestions", () => {
      process.env = {
        NODE_ENV: "production",
        SERVER_PRIVATE_KEY: "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
      };

      validateEnv();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Required for on-chain operations")
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("SOROBAN_DISABLED=true")
      );
    });
  });

  describe("Acceptance Criteria 2: Optional vs required config clearly distinguished", () => {
    it("should allow missing optional variables with defaults", () => {
      process.env = {
        SOROBAN_DISABLED: "true",
      };

      const config = validateEnv();

      expect(config.port).toBe(3001);
      expect(config.rpcUrl).toBe("https://soroban-testnet.stellar.org:443");
      expect(config.networkPassphrase).toBe("Test SDF Network ; September 2015");
      expect(config.allowedAssets).toEqual(["USDC", "XLM"]);
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it("should require CONTRACT_ID and SERVER_PRIVATE_KEY when Soroban enabled", () => {
      process.env = {
        NODE_ENV: "production",
        SOROBAN_DISABLED: "false",
      };

      validateEnv();

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("should accept valid CONTRACT_ID and SERVER_PRIVATE_KEY", () => {
      process.env = {
        CONTRACT_ID: "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
        SERVER_PRIVATE_KEY: "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
      };

      const config = validateEnv();

      expect(config.sorobanEnabled).toBe(true);
      expect(config.contractId).toBe(
        "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3"
      );
      expect(config.serverPrivateKey).toBe(
        "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3"
      );
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it("should parse PORT as number", () => {
      process.env = {
        PORT: "5000",
        SOROBAN_DISABLED: "true",
      };

      const config = validateEnv();

      expect(config.port).toBe(5000);
      expect(typeof config.port).toBe("number");
    });

    it("should use default PORT when not provided", () => {
      process.env = {
        SOROBAN_DISABLED: "true",
      };

      const config = validateEnv();

      expect(config.port).toBe(3001);
    });
  });

  describe("Acceptance Criteria 3: Local non-chain development can run intentionally", () => {
    it("should allow local development with SOROBAN_DISABLED=true", () => {
      process.env = {
        SOROBAN_DISABLED: "true",
      };

      const config = validateEnv();

      expect(config.sorobanEnabled).toBe(false);
      expect(config.contractId).toBeNull();
      expect(config.serverPrivateKey).toBeNull();
      expect(exitSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Soroban disabled")
      );
    });

    it("should show warning when Soroban disabled", () => {
      process.env = {
        SOROBAN_DISABLED: "true",
      };

      validateEnv();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("⚠️  Soroban disabled")
      );
    });

    it("should not require CONTRACT_ID/SERVER_PRIVATE_KEY when SOROBAN_DISABLED=true", () => {
      process.env = {
        SOROBAN_DISABLED: "true",
        PORT: "3001",
      };

      const config = validateEnv();

      expect(config.sorobanEnabled).toBe(false);
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it("should still validate other config even with SOROBAN_DISABLED=true", () => {
      process.env = {
        SOROBAN_DISABLED: "true",
        PORT: "invalid_port",
      };

      validateEnv();

      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("Acceptance Criteria 4: README stays aligned with validation rules", () => {
    it("should validate ALLOWED_ASSETS from README section 8", () => {
      process.env = {
        SOROBAN_DISABLED: "true",
        ALLOWED_ASSETS: "USDC,XLM,EURC",
      };

      const config = validateEnv();

      expect(config.allowedAssets).toEqual(["USDC", "XLM", "EURC"]);
    });

    it("should use default ALLOWED_ASSETS from README", () => {
      process.env = {
        SOROBAN_DISABLED: "true",
      };

      const config = validateEnv();

      expect(config.allowedAssets).toEqual(["USDC", "XLM"]);
    });

    it("should validate RPC_URL default from README", () => {
      process.env = {
        CONTRACT_ID: "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
        SERVER_PRIVATE_KEY: "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
      };

      const config = validateEnv();

      expect(config.rpcUrl).toBe("https://soroban-testnet.stellar.org:443");
    });

    it("should validate NETWORK_PASSPHRASE default from README", () => {
      process.env = {
        CONTRACT_ID: "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
        SERVER_PRIVATE_KEY: "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
      };

      const config = validateEnv();

      expect(config.networkPassphrase).toBe("Test SDF Network ; September 2015");
    });
  });

  describe("Additional validation scenarios", () => {
    it("should warn when WEBHOOK_DESTINATION_URL set without WEBHOOK_SIGNING_SECRET", () => {
      process.env = {
        SOROBAN_DISABLED: "true",
        WEBHOOK_DESTINATION_URL: "https://example.com/webhook",
      };

      validateEnv();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("WEBHOOK_SIGNING_SECRET is not")
      );
    });

    it("should validate WEBHOOK_DESTINATION_URL format", () => {
      process.env = {
        SOROBAN_DISABLED: "true",
        WEBHOOK_DESTINATION_URL: "not-a-url",
      };

      validateEnv();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("WEBHOOK_DESTINATION_URL validation failed")
      );
    });

    it("should reject empty ALLOWED_ASSETS", () => {
      process.env = {
        SOROBAN_DISABLED: "true",
        ALLOWED_ASSETS: "",
      };

      validateEnv();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("ALLOWED_ASSETS must contain at least one asset code")
      );
    });

    it("should normalize asset codes to uppercase", () => {
      process.env = {
        SOROBAN_DISABLED: "true",
        ALLOWED_ASSETS: "usdc, xlm, eurc",
      };

      const config = validateEnv();

      expect(config.allowedAssets).toEqual(["USDC", "XLM", "EURC"]);
    });

    it("should return ValidatedConfig with all required properties", () => {
      process.env = {
        CONTRACT_ID: "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
        SERVER_PRIVATE_KEY: "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3",
      };

      const config = validateEnv();

      expect(config).toHaveProperty("port");
      expect(config).toHaveProperty("sorobanEnabled");
      expect(config).toHaveProperty("contractId");
      expect(config).toHaveProperty("serverPrivateKey");
      expect(config).toHaveProperty("rpcUrl");
      expect(config).toHaveProperty("networkPassphrase");
      expect(config).toHaveProperty("allowedAssets");
      expect(config).toHaveProperty("dbPath");
      expect(config).toHaveProperty("webhookDestinationUrl");
      expect(config).toHaveProperty("webhookSigningSecret");
      expect(config).toHaveProperty("jwtSecret");
      expect(config).toHaveProperty("serverSigningKey");
      expect(config).toHaveProperty("domain");
    });
  });

  describe("Acceptance Criteria: Startup validation for SOROBAN_RPC_URL, STELLAR_CONTRACT_ID, and STELLAR_NETWORK", () => {
    describe("in production mode", () => {
      beforeEach(() => {
        process.env.NODE_ENV = "production";
      });

      it("should exit with code 1 when SOROBAN_RPC_URL is missing", () => {
        process.env.STELLAR_CONTRACT_ID = "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3";
        process.env.STELLAR_NETWORK = "testnet";
        process.env.SERVER_PRIVATE_KEY = "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3";
        
        validateEnv();
        
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("SOROBAN_RPC_URL is required in production")
        );
      });

      it("should exit with code 1 when STELLAR_CONTRACT_ID is missing", () => {
        process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org:443";
        process.env.STELLAR_NETWORK = "testnet";
        process.env.SERVER_PRIVATE_KEY = "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3";

        validateEnv();

        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("STELLAR_CONTRACT_ID is required in production")
        );
      });

      it("should exit with code 1 when STELLAR_NETWORK is missing", () => {
        process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org:443";
        process.env.STELLAR_CONTRACT_ID = "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3";
        process.env.SERVER_PRIVATE_KEY = "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3";

        validateEnv();

        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("STELLAR_NETWORK is required in production")
        );
      });

      it("should exit with code 1 when SERVER_PRIVATE_KEY is missing", () => {
        process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org:443";
        process.env.STELLAR_CONTRACT_ID = "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3";
        process.env.STELLAR_NETWORK = "testnet";

        validateEnv();

        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("SERVER_PRIVATE_KEY is required in production")
        );
      });
    });

    describe("in development mode", () => {
      beforeEach(() => {
        process.env.NODE_ENV = "development";
      });

      it("should log warning and use testnet default when SOROBAN_RPC_URL is missing", () => {
        process.env.STELLAR_CONTRACT_ID = "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3";
        process.env.STELLAR_NETWORK = "testnet";
        process.env.SERVER_PRIVATE_KEY = "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3";

        const config = validateEnv();

        expect(exitSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("SOROBAN_RPC_URL is missing in development")
        );
        expect(config.rpcUrl).toBe("https://soroban-testnet.stellar.org:443");
      });

      it("should log warning and use testnet default when STELLAR_CONTRACT_ID is missing", () => {
        process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org:443";
        process.env.STELLAR_NETWORK = "testnet";
        process.env.SERVER_PRIVATE_KEY = "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3";

        const config = validateEnv();

        expect(exitSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("STELLAR_CONTRACT_ID is missing in development")
        );
        expect(config.contractId).toBe("CCJW2RLIN4MQQ4DAJMMR3F5QPDA6QYTKXJMEVI3XOTDBTBCLBB553J74");
      });

      it("should log warning and use testnet default when STELLAR_NETWORK is missing", () => {
        process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org:443";
        process.env.STELLAR_CONTRACT_ID = "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3";
        process.env.SERVER_PRIVATE_KEY = "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3";

        const config = validateEnv();

        expect(exitSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("STELLAR_NETWORK is missing in development")
        );
        expect(config.networkPassphrase).toBe("Test SDF Network ; September 2015");
      });

      it("should map STELLAR_NETWORK public to public passphrase", () => {
        process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org:443";
        process.env.STELLAR_CONTRACT_ID = "CBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3";
        process.env.STELLAR_NETWORK = "public";
        process.env.SERVER_PRIVATE_KEY = "SBZVMB74Z76QZ3ZZZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3";

        const config = validateEnv();

        expect(config.networkPassphrase).toBe("Public Global Stellar Network ; October 2015");
      });
    });
  });
});

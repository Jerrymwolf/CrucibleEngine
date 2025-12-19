{ pkgs }: {
  deps = [
    # Node.js and package manager
    pkgs.nodejs_20
    pkgs.nodePackages.pnpm

    # TypeScript tooling
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server

    # Database
    pkgs.postgresql

    # Git and utilities
    pkgs.git
    pkgs.openssl
  ];

  env = {
    # Ensure pnpm is available
    PNPM_HOME = "/home/runner/.local/share/pnpm";
  };
}

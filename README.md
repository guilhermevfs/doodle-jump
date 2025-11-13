# FHEDoodleJump – FHEVM React Game

FHEDoodleJump is a browser-based Doodle Jump-inspired game built with React, integrated with **FHEVM** (Fully Homomorphic Encryption Virtual Machine). Players can jump on platforms, score points, and submit encrypted scores to the blockchain.

This project is based on a minimal React + FHEVM template.

---

## Features

- 🕹️ Classic Doodle Jump gameplay: jump on platforms, move left/right.
- 🎨 Platforms with different colors and behaviors:
  - **Green** – static platform  
  - **Blue** – moving platform  
  - **Brown** – breaks after touch  
- 🔒 Submit scores encrypted via FHEVM.  
- 📊 Decrypt and verify scores on-chain.  
- 🌐 Wallet connection via RainbowKit.  
- 💻 Built with React, TypeScript, TailwindCSS, Framer Motion.

---

## How to Play

FHEDoodleJump is a platform-jumping game similar to Doodle Jump, with FHEVM integration for submitting encrypted scores.

### 1. Start the Game
- Click **Connect Wallet** to connect to FHEVM (only once per session).
- Click **Start Challenge** to begin the game for the first time, or **Restart Challenge** to play again after a game over.

### 2. Controls
- **Arrow Left** → Move the character left.
- **Arrow Right** → Move the character right.
- The character will **automatically jump** when landing on a platform.

### 3. Platforms
Each platform has a color and special behavior:

| Platform Color | Behavior |
|----------------|----------|
| **Green**      | Standard static platform. |
| **Blue**       | Moving horizontally; character moves with it when jumped on. |
| **Brown**      | Breaks after jumping on it; cannot be used again. |

### 4. Objective
- Keep jumping upwards to reach **the highest score possible**.
- Avoid falling off the screen — falling ends the game.

### 5. Scoring
- Your score increases as you ascend.
- After a game over, you can **submit your score encrypted to FHEVM** for verification.

### 6. Tips
- Use moving platforms strategically to reach higher.
- Brown platforms give a boost but will disappear, so plan your jumps carefully.
- Left and right arrows let you control horizontal movement; timing is key for high scores.

---

## 📋 Prerequinextjss

Before you begin, ensure you have:

- **Node.js** (v18 or higher)
- **pnpm** package manager
- **MetaMask** browser extension
- **Git** for cloning the repository

## 🛠️ Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd doodle-jump

# Initialize submodules (includes fhevm-hardhat-template)
git submodule update --init --recursive

# Install dependencies
pnpm install
```

### 2. Environment Configuration

Set up your Hardhat environment variables by following the [FHEVM documentation](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional):

- `MNEMONIC`: Your wallet mnemonic phrase
- `INFURA_API_KEY`: Your Infura API key for Sepolia

### 3. Start Development Environment

**Option A: Local Development (Recommended for testing)**

```bash
# Terminal 1: Start local Hardhat node
pnpm chain
# RPC URL: http://127.0.0.1:8545 | Chain ID: 31337

# Terminal 2: Deploy contracts to localhost
pnpm deploy:localhost

# Terminal 3: Start the frontend
pnpm start
```

**Option B: Sepolia Testnet**

```bash
# Deploy to Sepolia testnet
pnpm deploy:sepolia

# Start the frontend
pnpm start
```

### 4. Connect MetaMask

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click "Connect Wallet" and select MetaMask
3. If using localhost, add the Hardhat network to MetaMask:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`

### ⚠️ Sepolia Production note

- In production, `NEXT_PUBLIC_ALCHEMY_API_KEY` must be set (see `packages/nextjs/scaffold.config.ts`). The app throws if missing.
- Ensure `packages/nextjs/contracts/deployedContracts.ts` points to your live contract addresses.
- Optional: set `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` for better WalletConnect reliability.
- Optional: add per-chain RPCs via `rpcOverrides` in `packages/nextjs/scaffold.config.ts`.

## 🔧 Troubleshooting

### Common MetaMask + Hardhat Issues

When developing with MetaMask and Hardhat, you may encounter these common issues:

#### ❌ Nonce Mismatch Error

**Problem**: MetaMask tracks transaction nonces, but when you restart Hardhat, the node resets while MetaMask doesn't update its tracking.

**Solution**:
1. Open MetaMask extension
2. Select the Hardhat network
3. Go to **Settings** → **Advanced**
4. Click **"Clear Activity Tab"** (red button)
5. This resets MetaMask's nonce tracking

#### ❌ Cached View Function Results

**Problem**: MetaMask caches smart contract view function results. After restarting Hardhat, you may see outdated data.

**Solution**:
1. **Restart your entire browser** (not just refresh the page)
2. MetaMask's cache is stored in extension memory and requires a full browser restart to clear

> 💡 **Pro Tip**: Always restart your browser after restarting Hardhat to avoid cache issues.

For more details, see the [MetaMask development guide](https://docs.metamask.io/wallet/how-to/run-devnet/).

## 📁 Project Structure

This template uses a monorepo structure with three main packages:

```
doodle-jump/
├── packages/
│   ├── fhevm-hardhat-template/    # Smart contracts & deployment
│   ├── fhevm-sdk/                 # FHEVM SDK package
│   └── nextjs/                      # React frontend application
└── scripts/                       # Build and deployment scripts
```

### Key Components

#### 🔗 FHEVM Integration (`packages/nextjs/hooks`)
- **`useFHEDoodleJump.tsx`**: Example hook demonstrating FHEVM contract interaction
- Essential hooks for FHEVM-enabled smart contract communication
- Easily copyable to any FHEVM + React project

#### 🎣 Wallet Management (`packages/nextjs/hooks/helper/`)
- MetaMask wallet provider hooks
- Compatible with EIP-6963 standard
- Easily adaptable for other wallet providers

#### 🔧 Flexibility
- Replace `ethers.js` with `Wagmi` or other React-friendly libraries
- Modular architecture for easy customization
- Support for multiple wallet providers

## 📚 Additional Resources

### Official Documentation
- [FHEVM Documentation](https://docs.zama.ai/protocol/solidity-guides/) - Complete FHEVM guide
- [FHEVM Hardhat Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat) - Hardhat integration
- [Relayer SDK Documentation](https://docs.zama.ai/protocol/relayer-sdk-guides/) - SDK reference
- [Environment Setup](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional) - MNEMONIC & API keys

### Development Tools
- [MetaMask + Hardhat Setup](https://docs.metamask.io/wallet/how-to/run-devnet/) - Local development
- [React Documentation](https://reactjs.org/) - React framework guide

### Community & Support
- [FHEVM Discord](https://discord.com/invite/zama) - Community support
- [GitHub Issues](https://github.com/zama-ai/fhevm-react-template/issues) - Bug reports & feature requests

## 📄 License

This project is licensed under the **BSD-3-Clause-Clear License**. See the [LICENSE](LICENSE) file for details.

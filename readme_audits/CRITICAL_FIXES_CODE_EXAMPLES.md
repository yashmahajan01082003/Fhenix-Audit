# CRITICAL FIXES - CODE EXAMPLES

This document provides concrete code fixes for the most critical issues identified in the audit.

---

## 1. FIX: Secure Badge Minting

**File:** `hardhat/contracts/FhenixLearnBadge.sol`

### Problem
Public `mint()` function allows anyone to mint unlimited badges.

### Solution: Implement Access Control

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract FhenixLearnBadge is ERC721URIStorage, Ownable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 private _nextTokenId;

    event BadgeMinted(address indexed to, uint256 indexed tokenId, string uri);

    constructor() ERC721("Fhenix Learn Badge", "FHB") Ownable(msg.sender) {
        // Grant deployer minter role
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @dev Mints a new badge - only authorized minters can call
     */
    function mint(string memory uri) public onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit BadgeMinted(msg.sender, tokenId, uri);
        return tokenId;
    }

    /**
     * @dev Admin mints directly to address
     */
    function adminMint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit BadgeMinted(to, tokenId, uri);
        return tokenId;
    }

    /**
     * @dev Add authorized minter
     */
    function addMinter(address account) public onlyOwner {
        _grantRole(MINTER_ROLE, account);
    }

    /**
     * @dev Remove authorized minter
     */
    function removeMinter(address account) public onlyOwner {
        _revokeRole(MINTER_ROLE, account);
    }
}
```

---

## 2. FIX: API Authentication & Validation

**File:** `server.js`

### Problem
- No authentication on endpoints
- No input validation
- XP can be set to any value

### Solution: Add Auth Middleware & Validation

```javascript
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import DOMPurify from 'dompurify';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// SECURITY: CORS with whitelist
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());

// SECURITY: Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 30,              // 30 requests per minute
    standardHeaders: true,
    legacyHeaders: false
});

const strictLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,               // 5 writes per minute
    skip: (req) => req.method === 'GET'
});

app.use(limiter);
app.use('/api/progress', strictLimiter);

// SECURITY: Input validation functions
function validateUserId(userId) {
    if (typeof userId !== 'string' || userId.length === 0) {
        throw new Error('Invalid user_id');
    }
    if (userId.length > 255) {
        throw new Error('user_id too long');
    }
    return userId;
}

function validateXP(xp) {
    if (typeof xp !== 'number') {
        throw new Error('XP must be a number');
    }
    if (xp < 0 || xp > 1000000) {
        throw new Error('XP out of valid range (0-1000000)');
    }
    if (!Number.isInteger(xp)) {
        throw new Error('XP must be an integer');
    }
    return xp;
}

function validateDisplayName(name) {
    if (name === null || name === undefined) {
        return null;
    }
    if (typeof name !== 'string') {
        throw new Error('display_name must be string');
    }
    // Sanitize HTML, limit length
    let sanitized = name.trim().substring(0, 50);
    // Remove potentially harmful chars
    sanitized = sanitized.replace(/[<>\"'&]/g, '');
    return sanitized || null;
}

function validateStringArray(arr, maxItems = 1000, maxItemLength = 100) {
    if (!Array.isArray(arr)) {
        return [];
    }
    return arr
        .filter(item => typeof item === 'string')
        .filter(item => item.length <= maxItemLength)
        .slice(0, maxItems);
}

// SECURITY: Session/Auth middleware (stub - implement with actual auth)
function requireAuth(req, res, next) {
    // In production, verify JWT token or session cookie
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    req.authenticatedUserId = userId;
    next();
}

// ... (storage adapters remain same)

// Get progress for a user
app.get('/api/progress/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        validateUserId(userId);

        const row = await storage.getByUserId(userId);
        if (row || !wallet || wallet === userId) {
            return res.json(row || defaultProgress(userId));
        }

        const migrated = await storage.migrateWalletToUser(userId, wallet);
        return res.json(migrated || defaultProgress(userId));
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// Update progress for a user - PROTECTED
app.post('/api/progress', requireAuth, async (req, res) => {
    try {
        const { user_id, display_name, xp, completed_modules, completed_lessons, badges } = req.body;

        // SECURITY: Validate user owns this progress entry
        if (req.authenticatedUserId !== user_id) {
            return res.status(403).json({ error: 'Cannot update other users progress' });
        }

        // Validate inputs
        const validatedUserId = validateUserId(user_id);
        const validatedXP = xp !== undefined ? validateXP(xp) : 0;
        const validatedDisplayName = validateDisplayName(display_name);
        const validatedModules = validateStringArray(completed_modules);
        const validatedLessons = validateStringArray(completed_lessons);
        const validatedBadges = validateStringArray(badges);

        await storage.upsert({
            user_id: validatedUserId,
            display_name: validatedDisplayName,
            xp: validatedXP,
            completed_modules: validatedModules,
            completed_lessons: validatedLessons,
            badges: validatedBadges
        });

        res.json({ success: true, message: 'Progress updated successfully' });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// Leaderboard: Get top users by XP - PUBLIC but rate limited
app.get('/api/leaderboard', async (req, res) => {
    try {
        let limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        // Validate pagination params
        if (limit < 1 || limit > 100) limit = 50;
        if (offset < 0) offset = 0;

        const rows = await storage.leaderboard(limit, offset);
        res.json(rows);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3101;
app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
});
```

---

## 3. FIX: Leaderboard JSON Parsing

**File:** `src/pages/Leaderboard.jsx`

### Problem
Badges field is pre-parsed array but client tries to parse again.

### Solution: Safe Type Checking

```jsx
import React, { useState, useEffect } from 'react';
import { Trophy, Medal, User, Crown, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/leaderboard?limit=50');
        if (res.ok) {
          const data = await res.json();
          
          // Safe badges parsing
          const formattedLeaders = data.map(leader => {
            let badges = [];
            
            // Check if badges is already an array
            if (Array.isArray(leader.badges)) {
              badges = leader.badges;
            }
            // Check if badges is a JSON string
            else if (typeof leader.badges === 'string') {
              try {
                const parsed = JSON.parse(leader.badges);
                badges = Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                console.warn('Failed to parse badges for user', leader.user_id, e);
                badges = [];
              }
            }

            return {
              user_id: leader.user_id,
              display_name: leader.display_name || `User ${leader.user_id.slice(0, 6)}...`,
              xp: Number.isInteger(leader.xp) ? leader.xp : 0,
              badges: badges
            };
          });

          // Sort deterministically (tiebreaker on user_id)
          formattedLeaders.sort((a, b) => {
            if (b.xp !== a.xp) return b.xp - a.xp;
            return a.user_id.localeCompare(b.user_id);
          });

          setLeaders(formattedLeaders);
          setError(null);
        } else {
          setError("Failed to fetch leaderboard from API");
        }
      } catch (e) {
        console.error("Failed to fetch leaderboard", e);
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return <Crown className="w-6 h-6 text-yellow-400" />;
      case 1: return <Medal className="w-6 h-6 text-slate-300" />;
      case 2: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-slate-500 font-bold w-6 text-center">{index + 1}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#011623] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#0AD9DC]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#011623] flex items-center justify-center">
        <div className="text-red-400 text-center">
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#0AD9DC] text-[#011623] rounded hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="min-h-screen bg-[#011623] flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-[#0AD9DC] mx-auto mb-4 opacity-50" />
          <p className="text-slate-400">No leaderboard data yet.</p>
          <p className="text-slate-500 text-sm mt-2">Complete lessons to appear here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#011623] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#0AD9DC]/10 text-[#0AD9DC] mb-4">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">CoFHE Leaderboard</h1>
          <p className="text-slate-400">Top pioneers mastering Encrypted Computation</p>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-[#022031] rounded-2xl border border-white/10 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-white/5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-2 md:col-span-1 text-center">Rank</div>
            <div className="col-span-6 md:col-span-7">User</div>
            <div className="col-span-2 text-right">Badges</div>
            <div className="col-span-2 text-right">XP</div>
          </div>

          {/* List */}
          <div className="divide-y divide-white/5">
            {leaders.map((leader, index) => {
              const isMe = currentUser && leader.user_id === currentUser.id;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={leader.user_id}
                  className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors ${isMe ? 'bg-[#0AD9DC]/5' : ''}`}
                >
                  <div className="col-span-2 md:col-span-1 flex justify-center">
                    {getRankIcon(index)}
                  </div>
                  <div className="col-span-6 md:col-span-7 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                                    bg-white/10 text-slate-300">
                      {leader.display_name ? leader.display_name[0].toUpperCase() : '?'}
                    </div>
                    <div>
                      <div className={`font-medium ${isMe ? 'text-[#0AD9DC]' : 'text-white'}`}>
                        {leader.display_name} {isMe && '(You)'}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm text-slate-400">{leader.badges.length || 0}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="font-bold text-[#0AD9DC]">{leader.xp}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. FIX: Badge Modal Chain Validation

**File:** `src/components/learn/BadgeAwardModal.jsx`

### Problem
No validation that wallet is on correct chain before minting.

### Solution: Add Chain Check

```jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, X, Share2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { usePrivy, useWallets, useSendTransaction } from '@privy-io/react-auth';
import { useUserProgress } from '@/components/UserProgressContext';
import { Interface, ethers } from 'ethers';
import { createPublicClient, custom } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

const BADGE_CONTRACT_ADDRESS = '0x910F079D4a48CbB8B28b791E8Cfd7B3c1c40eEAc';
const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

export default function BadgeAwardModal({ isOpen, onClose, badge }) {
    const { width, height } = useWindowSize();
    const { ready, authenticated } = usePrivy();
    const { wallets } = useWallets();
    const { progress, updateProgress } = useUserProgress();
    const [isMinting, setIsMinting] = useState(false);
    const [mintSuccess, setMintSuccess] = useState(false);
    const [mintError, setMintError] = useState(null);
    const [txHash, setTxHash] = useState(null);
    const [chainError, setChainError] = useState(null);

    useEffect(() => {
        if (isOpen && badge) {
            setMintSuccess(false);
            setMintError(null);
            setTxHash(null);
            setChainError(null);
        }
    }, [isOpen, badge?.id]);

    if (!isOpen || !badge) return null;

    const isSpecial = badge.special === true;
    const confettiCount = isSpecial ? 1000 : 500;
    const badgeSize = isSpecial ? 'w-40 h-40' : 'w-32 h-32';
    const iconSize = isSpecial ? 'w-20 h-20' : 'w-16 h-16';

    const { sendTransaction } = useSendTransaction();

    const checkChainAndMint = async () => {
        if (!authenticated || !ready) {
            setMintError('Please connect your wallet first.');
            return;
        }
        if (!wallets?.length) {
            setMintError('No wallet connected.');
            return;
        }

        setIsMinting(true);
        setMintError(null);
        setChainError(null);

        try {
            const wallet = wallets[0];
            const provider = await wallet.getEthereumProvider();
            
            // Check chain
            const publicClient = createPublicClient({
                chain: arbitrumSepolia,
                transport: custom(provider),
            });

            const chainId = await publicClient.getChainId();
            
            if (chainId !== ARBITRUM_SEPOLIA_CHAIN_ID) {
                setChainError(
                    `Wrong network! Current: ${chainId}, Required: ${ARBITRUM_SEPOLIA_CHAIN_ID}. ` +
                    'Please switch to Arbitrum Sepolia in your wallet.'
                );
                setIsMinting(false);
                return;
            }

            // Proceed with minting
            await performMint(provider);

        } catch (err) {
            console.error('[BadgeAwardModal] Error:', err);
            setMintError(err.message || 'Failed to mint badge');
        } finally {
            setIsMinting(false);
        }
    };

    const performMint = async (provider) => {
        try {
            const metadata = {
                name: badge.name,
                description: badge.description || "You've mastered a new skill in the FHE universe.",
                image: "ipfs://bafkreiet6x2hw6c57q36o6srfpqedlcyr6m43d7sokq4f2f45v6z3qg4ma",
                attributes: [
                    { trait_type: "Badge ID", value: badge.id || "unknown" },
                    { trait_type: "Module", value: badge.id?.replace("module-", "") || "completion" }
                ]
            };
            const metadataString = JSON.stringify(metadata);
            const metadataUri = `data:application/json;base64,${btoa(metadataString)}`;

            const badgeInterface = new Interface([
                'function mint(string memory uri) public returns (uint256)'
            ]);
            const encodedData = badgeInterface.encodeFunctionData('mint', [metadataUri]);

            const { hash } = await sendTransaction({
                to: BADGE_CONTRACT_ADDRESS,
                data: encodedData,
                value: '0'
            });

            setTxHash(hash);

            // Wait for confirmation
            const receipt = await new Promise((resolve, reject) => {
                const checkTx = setInterval(async () => {
                    try {
                        const signer = new ethers.JsonRpcSigner(provider, wallet.address);
                        const tx = await signer.provider.getTransactionReceipt(hash);
                        if (tx) {
                            clearInterval(checkTx);
                            resolve(tx);
                        }
                    } catch (e) {
                        console.error('Error checking tx:', e);
                    }
                }, 1000);
                setTimeout(() => clearInterval(checkTx), 60000); // Timeout after 60s
            });

            if (receipt.status === 1) {
                setMintSuccess(true);
                // Update progress with new badge
                const newBadges = [...(progress?.badges || []), badge.id];
                await updateProgress({ badges: newBadges });
            } else {
                setMintError('Transaction failed on-chain');
            }
        } catch (err) {
            console.error('[performMint] Error:', err);
            setMintError(err.message || 'Failed to complete mint');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                >
                    {mintSuccess && <Confetti width={width} height={height} numberOfPieces={confettiCount} />}

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#022031] border border-white/10 rounded-2xl p-8 max-w-md w-full"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <motion.div
                                animate={mintSuccess ? { scale: 1.1 } : { scale: 1 }}
                                className={`${badgeSize} rounded-full ${badge.bg} ${badge.border} border-2 flex items-center justify-center mb-6`}
                            >
                                <Award className={`${iconSize} ${badge.color}`} />
                            </motion.div>

                            <h2 className="text-2xl font-bold text-white mb-2">{badge.name}</h2>
                            <p className="text-slate-400 mb-6">{badge.description}</p>

                            {/* Error Messages */}
                            {chainError && (
                                <div className="w-full bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">
                                    ⚠️ {chainError}
                                </div>
                            )}

                            {mintError && (
                                <div className="w-full bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">
                                    ❌ {mintError}
                                </div>
                            )}

                            {/* Success State */}
                            {mintSuccess && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="w-full bg-emerald-500/20 border border-emerald-500 text-emerald-200 p-3 rounded mb-4 text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4" />
                                        <div>
                                            <p className="font-bold">Badge minted!</p>
                                            {txHash && (
                                                <a
                                                    href={`https://sepolia-blockscout.arbitrum.io/tx/${txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs hover:underline"
                                                >
                                                    View on Explorer →
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Loading State */}
                            {isMinting && (
                                <div className="w-full text-center mb-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-[#0AD9DC] mx-auto mb-2" />
                                    <p className="text-slate-300 text-sm">
                                        {chainError ? 'Checking chain...' : txHash ? 'Confirming...' : 'Minting...'}
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 w-full">
                                {mintSuccess ? (
                                    <Button
                                        onClick={onClose}
                                        className="flex-1 bg-[#0AD9DC] text-[#011623] hover:bg-[#0AD9DC]/90"
                                    >
                                        Done
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            onClick={onClose}
                                            disabled={isMinting}
                                            className="flex-1 bg-white/10 text-white hover:bg-white/20"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={checkChainAndMint}
                                            disabled={isMinting}
                                            className="flex-1 bg-[#0AD9DC] text-[#011623] hover:bg-[#0AD9DC]/90"
                                        >
                                            {isMinting ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : null}
                                            {isMinting ? 'Processing...' : 'Mint Badge'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
```

---

## 5. FIX: Error Boundary Component

**File:** `src/components/ErrorBoundary.jsx` (NEW)

```jsx
import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null,
            errorInfo: null 
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
        // In production, log to error tracking service
        // logErrorToService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#011623] flex items-center justify-center px-4">
                    <div className="max-w-md w-full">
                        <div className="bg-[#022031] border border-red-500/20 rounded-2xl p-8">
                            <div className="flex justify-center mb-6">
                                <AlertCircle className="w-12 h-12 text-red-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white text-center mb-4">
                                Something went wrong
                            </h1>
                            <p className="text-slate-400 text-center mb-4">
                                An unexpected error occurred. Please try again.
                            </p>
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-200 overflow-auto max-h-40">
                                    <summary className="cursor-pointer font-bold mb-2">Error Details</summary>
                                    <pre className="whitespace-pre-wrap">
                                        {this.state.error.toString()}
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                </details>
                            )}
                            <button
                                onClick={this.handleReset}
                                className="w-full bg-[#0AD9DC] text-[#011623] font-bold py-2 px-4 rounded-lg hover:bg-[#0AD9DC]/90 transition-colors flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
```

**Usage in App.jsx:**

```jsx
import ErrorBoundary from '@/components/ErrorBoundary';

export default function App() {
    return (
        <ErrorBoundary>
            <Routes>
                {/* routes */}
            </Routes>
        </ErrorBoundary>
    );
}
```

---

## 6. FIX: Hardhat Config Security

**File:** `hardhat/hardhat.config.js`

```javascript
require("cofhe-hardhat-plugin");
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

// Validate environment on startup
function validateEnvironment() {
    if (!process.env.ARBITRUM_SEPOLIA_RPC_URL && process.env.HARDHAT_NETWORK !== 'hardhat') {
        throw new Error(
            'ARBITRUM_SEPOLIA_RPC_URL not set. ' +
            'Please add to .env: ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc'
        );
    }
    if (!process.env.PRIVATE_KEY && process.env.HARDHAT_NETWORK === 'arb-sepolia') {
        throw new Error(
            'PRIVATE_KEY not set. ' +
            'Please add to .env: PRIVATE_KEY=0x...'
        );
    }
}

// Only validate when actually deploying/running
if (process.argv.includes('run') || process.argv.includes('deploy')) {
    validateEnvironment();
}

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
    solidity: {
        version: "0.8.25",
        settings: {
            evmVersion: "cancun",
            optimizer: { enabled: true, runs: 200 }
        }
    },
    paths: {
        sources: "./contracts",
        artifacts: "./artifacts",
        cache: "./cache"
    },
    networks: {
        "arb-sepolia": {
            url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 421614
        }
    },
    cofhe: {
        logMocks: false
    }
};
```

---

## 7. FIX: UserNotRegisteredError Theme

**File:** `src/components/UserNotRegisteredError.jsx`

```jsx
const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#011623]">
      <div className="max-w-md w-full p-8 bg-[#022031] rounded-2xl shadow-2xl border border-white/10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-red-500/20 border border-red-500/50">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Access Restricted</h1>
          <p className="text-slate-400 mb-8">
            You are not registered to use this application. Please contact the app administrator to request access.
          </p>
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-400 text-left">
            <p className="font-semibold text-slate-300 mb-2">If you believe this is an error:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the app administrator for access</li>
              <li>Try logging out and back in again</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;
```

---

## Implementation Priority

1. **Immediately (before any deployment):**
   - Fix badge minting access control
   - Add API authentication and validation
   - Fix error parsing on leaderboard

2. **Within 1 week:**
   - Add chain validation to badge modal
   - Add error boundary
   - Fix theme issues
   - Remove hardhat logging

3. **Within 2 weeks:**
   - Implement rate limiting
   - Add CORS whitelist
   - Implement XP calculation system
   - Add progress validation

---

**Next Steps:**
1. Create GitHub issues from these fixes
2. Implement in priority order
3. Add comprehensive tests
4. Deploy to testnet for validation
5. Schedule security audit before mainnet

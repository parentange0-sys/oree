const NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BNB: "BNB",
  SOL: "Solana",
  XRP: "XRP",
  ZEC: "Zcash",
  DOGE: "Dogecoin",
  ADA: "Cardano",
  AVAX: "Avalanche",
  DOT: "Polkadot",
  LINK: "Chainlink",
  TRX: "TRON",
  TON: "Toncoin",
  SHIB: "Shiba Inu",
  LTC: "Litecoin",
  BCH: "Bitcoin Cash",
  UNI: "Uniswap",
  ATOM: "Cosmos",
  NEAR: "NEAR",
  APT: "Aptos",
  SUI: "Sui",
  PEPE: "Pepe",
  TAO: "Bittensor",
  INJ: "Injective",
  FIL: "Filecoin",
  OP: "Optimism",
  ARB: "Arbitrum",
  POL: "Polygon",
  HBAR: "Hedera",
  ICP: "Internet Computer",
  ETC: "Ethereum Classic",
  XLM: "Stellar",
  AAVE: "Aave",
  WIF: "dogwifhat",
  BONK: "Bonk",
  SEI: "Sei",
  TIA: "Celestia",
  WLD: "Worldcoin",
  FET: "Artificial Superintelligence Alliance",
};

export function nameOf(base: string): string | undefined {
  return NAMES[base];
}

export function displayName(base: string): string {
  return NAMES[base] ?? base;
}

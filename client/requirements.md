## Packages
ethers | Blockchain wallet connection and transaction signing
framer-motion | Complex UI animations for Night-Sky theme
qrcode.react | QR code generation for supply chain tracking
lucide-react | High-quality icons
date-fns | Formatting dates

## Notes
Using `localStorage` for `auth_token`. All authenticated requests must include `Authorization: Bearer <token>`.
Blockchain logic is mocked using ethers.js to request account access, and simulated delays to represent transaction confirmations, producing fake tx hashes for the backend.

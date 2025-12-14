# KKU Cloud Application Project SSO - Login UI

Custom Login UI สำหรับ Zitadel SSO พัฒนาด้วย Next.js

## Features

- 🎨 Custom branding สำหรับ KKU Cloud Application Project
- 🔐 Username/Password authentication
- 🌐 OIDC/OAuth2 flow support
- 📱 Responsive design
- 🇹🇭 Thai language support

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ZITADEL_API_URL` | Zitadel API endpoint | `http://zitadel:8080` |
| `ZITADEL_SERVICE_USER_TOKEN` | Service user PAT | - |
| `ZITADEL_SERVICE_USER_TOKEN_FILE` | Path to PAT file | `/app/pat/login-client.pat` |
| `NEXT_PUBLIC_BASE_PATH` | Base path for the app | `/ui/v2/login` |
| `NEXT_PUBLIC_APPLICATION_NAME` | Application name | `KKU Cloud Application Project SSO` |

## Docker Build

```bash
# Build image
docker build -t kku-login-ui:latest .

# Run container
docker run -p 3000:3000 \
  -e ZITADEL_API_URL=http://zitadel:8080 \
  kku-login-ui:latest
```

## Directory Structure

```
login-ui/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/             # API routes
│   │   ├── loginname/       # Username input page
│   │   ├── password/        # Password input page
│   │   └── signedin/        # Success page
│   ├── components/          # Reusable React components
│   └── lib/                 # Utility functions
├── Dockerfile
├── package.json
└── tailwind.config.js
```

## Credits

- Built for KKU Cloud Application Project
- SSO by อาจารย์ชัชชัย
- Powered by Zitadel

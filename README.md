# CepatBina - Multi-Tenant Website Builder with Custom Domain Support

[![Deployment Status](https://img.shields.io/badge/deployment-testing-blue)](https://github.com/ArifZakariaLLM/Interactive-link)
[![Node Version](https://img.shields.io/badge/node-v20.12.1-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> A powerful, scalable website builder platform that enables users to create projects, share them with the community, and connect custom domains—all with automatic SSL and global CDN.

## 🚀 Deployment Status

**Last Updated**: October 1, 2025  
**Status**: Production Ready  
**Auto-Deploy**: Vercel Integration Active

---

## 📋 Table of Contents

- [System Overview](#system-overview)
- [Live Demo Example](#live-demo-example)
- [Features](#features)
- [Architecture](#architecture)
- [Database Schema](#database-schema-supabase)
- [Complete Feature Set](#complete-feature-set)
- [File Structure](#file-structure)
- [Domain Routing System](#the-domain-routing-system)
- [Deployment Configuration](#deployment-configuration)
- [Setup Instructions](#setup-instructions)
- [Testing the System](#testing-the-system)
- [Implementation Status](#current-implementation-status)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)

---

## System Overview

A complete website builder platform where users create projects, share them with the community, and connect custom domains. Each user can have multiple projects with different domains.

## Live Demo Example

### Client A has 2 projects:
- **Project 1**: `aqilxxxx` → `www.aqil.com`
- **Project 2**: `meow` → `www.meow.com`

Each project can have its own custom domain, and all projects can be shared in the community.

## Features

### Core Features
✅ **Multi-Project Support** - Each user can create unlimited projects
✅ **Custom Domain Mapping** - Each project can have multiple custom domains
✅ **Project Community** - Public projects can be shared and discovered
✅ **Privacy Controls** - Users can hide/show projects from community
✅ **Live Preview** - Instant preview of projects
✅ **Domain Management** - Add, verify, and remove domains
✅ **Automatic SSL** - Via Vercel/Let's Encrypt

## Architecture

### Two Vercel Projects from One GitHub Repository

#### Project A: Main Application (`cepatbina.com`)
- Dashboard for project management
- Website builder/editor
- Project Community page
- Authentication system
- Domain management UI

#### Project B: Live Sites Server (`*.cepatbina.com`)
- Serves all custom domains
- Routes domains to correct projects
- Handles SSL certificates
- Single serverless function (`/api/render.js`)

## Database Schema (Supabase)

### `projects` table
```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  code_content TEXT,
  is_public BOOLEAN DEFAULT true,
  is_community_visible BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `custom_domains` table
```sql
CREATE TABLE custom_domains (
  id UUID PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  user_id UUID REFERENCES auth.users(id),
  domain_name TEXT UNIQUE,
  status TEXT, -- pending/active/error
  verification_token TEXT,
  dns_instructions JSONB,
  error_message TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Complete Feature Set

### 1. Dashboard (`/dashboard`)
- View all your projects
- Create new projects
- Edit project content
- Manage custom domains per project
- See domain status (pending/active)
- One-click DNS verification
- Delete domains
- Navigate to Community

### 2. Project Community (`/community`)
- Browse all public projects
- Search by project name or domain
- Preview any public project
- Visit live sites
- Hide/show your own projects
- See project creators
- Filter and discover projects

### 3. Domain Management System

#### Add Domain Flow:
1. User clicks "Add Domain" on their project
2. Enters domain name (e.g., `client.com`)
3. System saves to database with status "pending"
4. Shows DNS configuration instructions
5. User configures DNS at their registrar
6. User clicks "Verify" button
7. System checks DNS records
8. If valid, adds to Vercel via API
9. Updates status to "active"
10. Domain goes live immediately

#### DNS Configuration Required:
```
For root domain:
A     @     76.76.21.21
A     @     76.76.21.61

For www subdomain:
CNAME www   cname.vercel-dns.com
```

### 4. Vercel API Integration
- Automatic domain addition when verified
- Automatic domain removal when deleted
- No manual Vercel dashboard work needed
- Token configured in `/src/utils/vercelApi.ts`

## File Structure
```
Interactive-link-main/
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx         # Project management
│   │   ├── ProjectCommunity.tsx  # Community browser
│   │   ├── WebsiteBuilder.tsx    # Code editor
│   │   └── LivePreview.tsx       # Preview component
│   ├── utils/
│   │   ├── dnsVerification.ts    # DNS checking
│   │   ├── vercelApi.ts         # Vercel domain API
│   │   └── fileManager.ts       # File operations
│   └── integrations/
│       └── supabase/
│           └── client.ts         # Database connection
├── api/
│   └── render.js                # Routes domains to projects
├── vercel.json                  # Main app config
├── vercel-live.json            # Live sites config
└── package.json
```

## The Domain Routing System

When someone visits a custom domain:

```
1. Request to www.aqil.com
   ↓
2. DNS resolves to Vercel (76.76.21.21)
   ↓
3. Vercel routes to Live Sites project
   ↓
4. /api/render.js executes:
   - Reads hostname: "www.aqil.com"
   - Queries: SELECT project_id FROM custom_domains WHERE domain_name = 'www.aqil.com'
   - Gets: project_id = 8
   - Fetches: SELECT code_content FROM projects WHERE id = 8
   - Returns: Project 8's HTML
   ↓
5. Visitor sees Project 8's website
```

## Deployment Configuration

### Main App Vercel Project
- **Name**: `cepatbina` (or your main project name)
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Domains**: `cepatbina.com`, `www.cepatbina.com`

### Live Sites Vercel Project
- **Name**: `cepatbina-live-sites`
- **Framework**: Other
- **Build Command**: `cp vercel-live.json vercel.json`
- **Output Directory**: `.`
- **Domains**: `*.cepatbina.com`, plus all customer domains

## Setup Instructions

### 1. Database Setup
Run these SQL scripts in Supabase:
```sql
-- Run create_domain_mappings_table.sql
-- Run add_community_column.sql
```

### 2. Configure Vercel API Token
Edit `/src/utils/vercelApi.ts`:
```javascript
const VERCEL_API_TOKEN = 'your-token-here';
const LIVE_SITES_PROJECT_ID = 'your-project-id';
```

### 3. Deploy Both Projects
```bash
# Main app deploys automatically on push to main

# Live Sites project needs manual setup:
# 1. Create new Vercel project
# 2. Import same GitHub repo
# 3. Configure as shown above
# 4. Add wildcard domain *.cepatbina.com
```

## Testing the System

### Test Subdomain Routing
1. Create project titled "test"
2. Visit `test.cepatbina.com`
3. Should show that project's content

### Test Custom Domain
1. Add domain to project
2. Configure DNS
3. Click verify
4. Visit domain - should work!

### Test Community
1. Create a public project
2. Visit `/community`
3. Your project should appear
4. Others can preview and visit it

## Current Implementation Status

### ✅ FULLY WORKING:
- Project creation and management
- Website builder/editor
- Custom domain addition
- DNS verification
- Vercel API integration
- Domain deletion
- Project Community
- Privacy controls (hide/show from community)
- Live preview
- Multiple domains per project
- Domain status tracking

### ⚠️ REQUIRES CONFIGURATION:
- Vercel API token must be added
- Live Sites project must be created in Vercel
- DNS must be configured by users

### 🔄 FUTURE ENHANCEMENTS:
- Automatic DNS provider integration
- Domain analytics
- Project templates
- Collaboration features
- Version history
- Custom SSL certificates

## Security Considerations

1. **RLS Policies**: Ensure Row Level Security is enabled on all tables
2. **Domain Verification**: Always verify DNS before activating domains
3. **API Token**: Keep Vercel API token secure
4. **Public Projects**: Users control what's visible in community
5. **Rate Limiting**: Consider adding rate limits for domain operations

## Support for 200+ Clients

This architecture supports:
- ✅ Unlimited projects per user
- ✅ Multiple domains per project
- ✅ Automatic SSL certificates
- ✅ Global CDN via Vercel
- ✅ Community sharing
- ✅ Privacy controls
- ✅ Scales to thousands of domains

## Troubleshooting

### Domain Not Working
1. Check DNS propagation (can take 1-48 hours)
2. Verify domain status is "active" in dashboard
3. Check if domain is added to Vercel Live Sites project
4. Ensure SSL certificate is provisioned

### Project Not Showing in Community
1. Check `is_public` is true
2. Check `is_community_visible` is true
3. Refresh the page

### DNS Verification Failing
1. Ensure A records point to 76.76.21.21 and 76.76.21.61
2. Wait for DNS propagation
3. Try verification again after 1-2 hours

## API Reference

### Domain Management
- `addDomainToVercel(domain)` - Adds domain to Vercel
- `removeDomainFromVercel(domain)` - Removes domain
- `verifyDomain(domain)` - Checks DNS configuration
- `checkDomainStatus(domain)` - Gets Vercel status

### Database Operations
All handled via Supabase client with RLS policies

## License & Credits

Built with:
- React + Vite
- Supabase
- Vercel
- TailwindCSS
- shadcn/ui

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure Supabase credentials
4. Add Vercel API token
5. Deploy to Vercel
6. Start building!

For support, check the troubleshooting section or open an issue on GitHub.
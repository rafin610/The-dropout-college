<div align="center">

# 🎓 The DropOut College Campus

**A Social Community Web Application for Self-Driven Creators, Learners & Builders**

*“We don’t drop out of learning. We drop out of the limits placed on it. Learn differently. Build relentlessly.”*

[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![KaTeX](https://img.shields.io/badge/KaTeX-Math_Typesetting-329894?style=for-the-badge)](https://katex.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-C6DA5E?style=for-the-badge)](LICENSE)

[**🌐 Live Website**](https://the-dropout-college.vercel.app) • [**💬 Join Discord**](https://discord.gg/rEkkzPbM4p) • [**📖 Reading Platform (ODHYAY)**](https://odhyay.vercel.app)

---

</div>

## 📌 Table of Contents

- [Overview](#-overview)
- [Core Campus Features](#-core-campus-features)
  - [1. Campus Social Feed](#1-campus-social-feed)
  - [2. The DropOut Journal & Studio](#2-the-dropout-journal--studio)
  - [3. Members Directory & Follow Network](#3-members-directory--follow-network)
  - [4. Member Profiles](#4-member-profiles)
  - [5. Staff Administration Panel](#5-staff-administration-panel)
  - [6. Robust Role-Based Access Control (RBAC)](#6-robust-role-based-access-control-rbac)
- [Design System & Aesthetics](#-design-system--aesthetics)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [Database & Storage Architecture](#-database--storage-architecture)
  - [Core Database Schema](#core-database-schema)
  - [Storage Buckets](#storage-buckets)
  - [Database Backups](#database-backups)
- [Testing Suite](#-testing-suite)
- [API Endpoints Reference](#-api-endpoints-reference)
- [Community & Socials](#-community--socials)
- [License](#-license)

---

## 🌟 Overview

**The DropOut College Campus** is a modern social community platform designed for independent developers, designers, mathematicians, writers, and curious builders. 

The platform connects members through micro-posts, comprehensive long-form technical publications via **The DropOut Journal**, an open member network, and a decentralized editorial hierarchy.

---

## ⚡ Core Campus Features

### 1. Campus Social Feed (`/`, `/post`, `/p/[id]`)
- **Micro-Posts Feed:** Real-time chronological thoughts feed with server-side pagination.
- **Post Composer:** Expressive posts capped at 300 characters with client-side image compression.
- **Photo Attachments:** Upload a single image per post with automatic WebP optimization.
- **Love Reactions:** Dedicated 1-click Love reaction system with optimistic UI state and duplicate prevention.
- **Discussion Threads:** Inline post comments with instant deletion privileges for authors and staff.
- **Shareable Post URLs:** Direct deep-linking via clean `/p/[id]` routes with OpenGraph card previews.

### 2. The DropOut Journal & Studio (`/journal`, `/journal/[slug]`, `/journal/studio`)
- **Editorial Reading Experience:** Long-form essays, mathematical derivations, and technical breakdowns.
- **TipTap WYSIWYG Studio:** Rich block editor with headings, tables, blockquotes, code blocks, and media embeds.
- **KaTeX Mathematical Typesetting:** Native compile-time and runtime LaTeX rendering for mathematical formulas and proofs.
- **Prism Syntax Highlighting:** Syntax highlighted code blocks across 50+ languages.
- **Publishing Lifecycle:** Multi-stage status pipeline:
  - `draft`: Work-in-progress, accessible only by author and authorized staff.
  - `published`: Publicly accessible with calculated reading time and auto-generated Table of Contents.
  - `unpublished` / soft-deleted: Archived safely without permanently removing content.
- **Category Taxonomy:** Organize publications under tracks (*Software Development*, *Design & Creative*, *Community*).

### 3. Members Directory & Follow Network (`/members`)
- **Fast Search & Filter:** Instant member search by display name, `@username`, or bio keywords.
- **One-Click Follow System:** Asynchronous follow/unfollow actions with optimistic count updates.
- **Relationship Integrity:** Database-level constraints prevent self-following and duplicate follower links.

### 4. Member Profiles (`/profile`, `/profile/[username]`)
- **Identity Header:** Dynamic banner cover, avatar uploads with fallback monogram generation, verified role badges, and join dates.
- **Followers & Following Dialogs:** Interactive modal inspecting a member's follower and following lists.
- **Content Tabs:**
  - **Posts:** Chronological feed of posts created by the member.
  - **Journals:** Publicly listed journal articles authored by the member (for editorial contributors and staff).
- **Profile Self-Management:** In-place profile editing for username, display name, bio, and avatar.

### 5. Staff Administration Panel (`/staff`)
- **Community Analytics Overview:** Live counter cards tracking total members, active accounts, suspended accounts, new registrations (30 days), and published journals.
- **Member Management:** Paginated member directory with live search, account status switching (`active`, `suspended`, `deleted`), and role assignments (`member`, `moderator`, `admin`).
- **Moderator Permissions Management:** Granular assignment of permissions to moderators (dashboard access, member moderation, journal creation, publishing, and report resolution).
- **Journal Editorial Control:** Centralized staff dashboard to review drafts, feature publications, toggle published status, or remove inappropriate submissions.

### 6. Robust Role-Based Access Control (RBAC)
- **Role Hierarchy:**
  - `admin` / `super_admin`: Full system control, role assignment, account status modification, and editorial override.
  - `moderator`: Configurable permissions for reviewing content, creating journals, and community moderation.
  - `member`: Standard authenticated member privileges (create posts, react, comment, follow, manage profile).
- **Defense in Depth:** Suspended and inactive accounts are blocked at both database RLS policies and server-side RPC validation.

---

## 🎨 Design System & Aesthetics

The Campus uses the **Midnight Glass** editorial design language:

- **Obsidian Dark Surface Palette:**
  - Canvas Background: `#070a08`
  - Elevated Cards & Dialogs: `#0d120f` with frosted backdrop blur (`rgba(13, 18, 15, 0.7)`)
  - Subdued Borders: `#1a231d`
- **Emerald & Lime Neon Accents:**
  - Primary Glow Accent: `#34d399` (Emerald) and `#B4F042` / `#C6DA5E` (Volt Lime) for badges, buttons, and active tabs.
- **Editorial Typography:**
  - Primary Body & Display: **Inter** / **Manrope**
  - Code & Math Annotations: **JetBrains Mono** / **DM Mono**
- **Mobile-Responsive Framework:**
  - Adaptive header with viewer profile pill and quick sign-out.
  - Mobile bottom navigation bar with active indicators and quick post composer launcher.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Framework** | [Next.js 16.4.3](https://nextjs.org/) | App Router with Turbopack & React Server Components |
| **Runtime** | [React 19.2.8](https://react.dev/) + [Node.js 24](https://nodejs.org/) | Server Actions, Streaming SSR, Optimistic UI |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict end-to-end type safety |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + Custom CSS | CSS design tokens (`campus.css`, `midnight-glass.css`) |
| **Database & Auth** | [Supabase](https://supabase.com/) | PostgreSQL 17, Row Level Security (RLS), Supabase Auth |
| **Rich Text Editor** | [TipTap 3](https://tiptap.dev/) | Headless block editor with custom extensions |
| **Math & Code** | [KaTeX](https://katex.org/) + [PrismJS](https://prismjs.com/) | Mathematical typesetting and syntax highlighting |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, consistent SVG icon set |
| **Testing** | Node.js Test Runner + tsx | Zero-dependency native unit and RLS integration testing |

---

## 📂 Project Architecture

```text
The drop out college/
├── public/                         # Static assets (favicons, logos)
├── scripts/                        # Database verification, security runners, backups
│   ├── export-database-backup.mjs  # Complete JSON & schema data exporter
│   ├── test-db-security.mjs        # Dockerized RLS security test runner
│   └── test-journal.mjs            # Journal & KaTeX unit test suite
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/v1/                 # Backend RESTful endpoints
│   │   │   ├── auth/me/            # Authentication & session resolution
│   │   │   ├── follows/            # Follower graph mutations
│   │   │   ├── health/             # System health status
│   │   │   ├── journal/            # Articles CRUD, permissions, upload
│   │   │   ├── members/            # Paginated members directory
│   │   │   ├── posts/              # Posts CRUD, comments, Love reactions
│   │   │   ├── profile/avatar/     # Profile avatar upload
│   │   │   ├── staff/              # Staff overview, members, roles, permissions
│   │   │   └── users/me/           # Member profile self-updates
│   │   ├── journal/                # Journal directory & /[slug] article reader
│   │   │   └── studio/             # TipTap journal authoring editor
│   │   ├── login/                  # Authentication page
│   │   ├── members/                # Members directory
│   │   ├── p/[id]/                 # Standalone single post view
│   │   ├── post/                   # Post composer route
│   │   ├── profile/                # Current user profile & /[username] routes
│   │   ├── staff/                  # Staff admin & moderator control panel
│   │   ├── campus.css              # Campus social feed & components CSS
│   │   ├── globals.css             # Base CSS tokens & typography
│   │   ├── layout.tsx              # Root app layout & frame
│   │   ├── midnight-glass.css      # Dark glassmorphic theme styling
│   │   └── page.tsx                # Campus Home Feed
│   ├── components/                 # React UI Components
│   │   ├── app/                    # AppHeader, AppSidebar, MobileBottomNav
│   │   ├── journal/                # JournalCard, JournalReader, TipTap editor
│   │   ├── members/                # MemberCard, MembersDirectory
│   │   ├── posts/                  # PostCard, Feed, PostComposer, LoveReaction, Comments
│   │   ├── profile/                # MemberProfile, FollowListDialog
│   │   └── avatar.tsx              # Avatar component with initials fallback
│   ├── lib/                        # Client utilities, image compression, time formatting
│   └── server/                     # Server-side business logic & Supabase queries
│       ├── admin/                  # Staff admin access & member policies
│       ├── auth/                   # Roles, permissions, account status guards
│       ├── journal/                # Articles CRUD, sanitization, validation
│       ├── media/                  # Image upload handlers & size validation
│       ├── members/                # Directory search & pagination
│       ├── posts/                  # Posts, loves, and comments operations
│       └── supabase/               # Supabase SSR client factories
├── supabase/
│   ├── backups/pre-cleanup/        # Exported JSON backups for all 37 tables
│   ├── migrations/                 # Versioned SQL migrations (0001 - 0017)
│   └── tests/                      # PostgreSQL test suites (security_rls.sql)
├── tests/                          # Automated unit test files (*.test.mts)
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- **Node.js**: `v20.x` or later (tested on Node `v24.x`)
- **Docker** *(optional, for running local PostgreSQL RLS tests)*
- **npm**, **pnpm**, or **bun**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rafin610/The-dropout-college.git
   cd The-dropout-college
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Populate the required credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Server-side Administrative Key (Used only in trusted server contexts & migrations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Security Guardrail:** Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side bundles. The client relies strictly on `NEXT_PUBLIC_SUPABASE_ANON_KEY` combined with PostgreSQL Row Level Security (RLS).

### Running the App

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Database & Storage Architecture

### Core Database Schema

The Campus platform is built on PostgreSQL with Row Level Security (RLS) enabled on all tables:

- **`profiles`**: Member identity, username, display name, avatar URL, bio, and account status (`active`, `suspended`, `deleted`).
- **`posts`**: Community thoughts and micro-posts (maximum 300 characters, optional photo attachment).
- **`post_loves`**: Unique member-post Love reactions (`post_id`, `user_id`).
- **`post_comments`**: Threaded comments on posts (`post_id`, `author_id`, `content`).
- **`articles`**: Long-form journal essays, TipTap JSON document content, cover image, category, and publication status (`draft`, `published`, `unpublished`).
- **`follows`**: Directed member follow graph (`follower_id` ↔ `following_id`).
- **`categories`**: Editorial categories for journal publications.
- **`user_roles`**: Role assignments (`admin`, `moderator`, `member`).
- **`admin_roles` & `permissions`**: Granular role-based capability mapping for the staff panel.
- **`audit_logs`**: Administrative activity audit records.

### Storage Buckets

Media assets are segregated into folder-scoped Supabase Storage buckets:

- **`post-media`**: Member-uploaded images for campus posts (JPEG, PNG, WebP, GIF; ≤ 5MB).
- **`journal-media`**: Cover images and embedded figures for Journal publications.
- **`profile-media`**: Custom member avatar uploads.
- **`project-covers`**: Legacy bucket maintained for backwards compatibility with existing journal cover image URLs.

### Database Backups

A complete, verified pre-cleanup backup of all production data is preserved in:
```text
supabase/backups/pre-cleanup/
├── users.json
├── profiles.json
├── articles.json
├── follows.json
├── user_roles.json
├── permissions.json
├── categories.json
├── policies.json       # 92 RLS policies
├── functions.json      # 92 Postgres functions & RPCs
├── indexes.json        # 88 database indexes
└── storage_objects.json# 15 live storage files
```

---

## 🧪 Testing Suite

Run the complete automated test suite:

```bash
# Run all unit tests & Journal suite (42 tests)
npm test

# Run Journal & KaTeX compilation tests specifically
npm run test:journal

# Run Unit tests specifically
npm run test:unit

# Run full PostgreSQL RLS security test in a Docker container
npm run test:db
```

All 42 core tests verify:
- TipTap HTML sanitization and XSS prevention.
- KaTeX equation compilation.
- Prism syntax highlighting.
- Article deletion permissions and soft-deletion behavior.
- RLS policy isolation for drafts, comments, and reactions.
- Safe redirect sanitization and open-redirect defenses.

---

## 📡 API Endpoints Reference

### Campus Posts
- `GET /api/v1/posts?page=1&limit=10` — Retrieve paginated campus feed.
- `POST /api/v1/posts` — Create a new post (max 300 characters).
- `GET /api/v1/posts/:id` — Get single post with author and love status.
- `PATCH /api/v1/posts/:id` — Edit an existing post.
- `DELETE /api/v1/posts/:id` — Delete a post (author or staff).
- `POST /api/v1/posts/:id/love` — Toggle Love reaction on a post.
- `GET /api/v1/posts/:id/comments` — Fetch comments for a post.
- `POST /api/v1/posts/:id/comments` — Add a comment to a post.
- `DELETE /api/v1/posts/:id/comments/:commentId` — Delete a comment.
- `POST /api/v1/posts/upload` — Upload an image for a post.

### The DropOut Journal
- `GET /api/v1/journal/articles` — Fetch published journal articles.
- `POST /api/v1/journal/articles` — Create a new article draft.
- `GET /api/v1/journal/articles/:id` — Fetch article draft or detail.
- `PATCH /api/v1/journal/articles/:id` — Update article content or publishing status.
- `DELETE /api/v1/journal/articles/:id` — Soft-delete an article.
- `GET /api/v1/journal/permissions` — Check current user's journal permissions.
- `POST /api/v1/journal/upload` — Upload journal cover or embedded figure.

### Members & Network
- `GET /api/v1/members?page=1&search=...` — Search & list community members.
- `GET /api/v1/follows?userId=...` — Fetch follower/following counts and relationship.
- `POST /api/v1/follows` — Follow a member.
- `DELETE /api/v1/follows` — Unfollow a member.
- `GET /api/v1/users/me` — Retrieve current member profile.
- `PATCH /api/v1/users/me` — Update display name, bio, and username.
- `POST /api/v1/profile/avatar` — Upload and update member avatar.

### Staff Administration
- `GET /api/v1/staff/overview` — Fetch community health and activity metrics.
- `GET /api/v1/staff/members` — Paginated member management list with filters.
- `PATCH /api/v1/staff/roles` — Update member account status or role.
- `GET /api/v1/staff/moderator-permissions` — Inspect assigned moderator permissions.

### System & Auth
- `GET /api/v1/auth/me` — Current authenticated user state.
- `GET /api/v1/health` — Platform health check.

---

## 🌐 Community & Socials

Stay connected with The DropOut College community:

- 💬 **Discord:** [Join the Community Server](https://discord.gg/rEkkzPbM4p)
- 📺 **YouTube:** [@TheDropOutCollege](https://www.youtube.com/@TheDropOutCollege-v4k)
- 📘 **Facebook:** [The DropOut College](https://www.facebook.com/profile.php?id=61593723286324)
- 📸 **Instagram:** [@thedrop0utcollege](https://www.instagram.com/thedrop0utcollege/)
- 🐦 **X (Twitter):** [@TheDropOutBD](https://x.com/TheDropOutBD)
- 📚 **Digital Library:** [ODHYAY](https://odhyay.vercel.app)

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
<sub>Crafted with relentless curiosity by the The DropOut College community.</sub>
</div>

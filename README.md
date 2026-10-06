<div align="center">

# 🎓 The DropOut College

**A Home for the Relentlessly Curious**

*“We don’t drop out of learning. We drop out of the limits placed on it. Learn differently. Build relentlessly.”*

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-C6DA5E?style=for-the-badge)](LICENSE)

[**🌐 Live Website**](https://the-dropout-college.vercel.app) • [**💬 Join Discord**](https://discord.gg/3xfu5TMgF) • [**📖 Reading Platform (ODHYAY)**](https://odhyay.vercel.app)

---

</div>

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Design Aesthetics](#-design-aesthetics)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [Supabase Configuration & Schema](#-supabase-configuration--schema)
- [API & Health Endpoints](#-api--health-endpoints)
- [Contributing](#-contributing)
- [Community & Socials](#-community--socials)
- [License](#-license)

---

## 🌟 Overview

**The DropOut College** is a modern, community-first talent and learning network built for self-directed learners, builders, developers, designers, and creators.

Traditional education often confines curiosity to rigid curricula and arbitrary credentials. The DropOut College flips the paradigm:
- Connect with people building real projects across disciplines.
- Share work in progress and receive constructive feedback.
- Find collaborators, mentors, and accountability partners.
- Learn by building, shipping, and sharing openly.

---

## ⚡ Key Features

### 👥 Community Members Directory (`/explore`)
- **Fast Search & Filter:** Search by name, `@handle`, bio keywords, or project disciplines.
- **Category Filter Chips:** Seamlessly browse members by paths like *Learn*, *Build*, and *Connect*.
- **Interactive Member Cards:**
  - Dynamic avatar badges with fallback monogram circles.
  - Active presence indicator (`● Online / Member`) with role-based styling.
  - Quick skill pills.
  - One-click profile inspection and **instant Follow/Unfollow** action with optimistic UI updates.
  - Quick action 3-dot dropdown menu for sharing and copying links.

### 👤 Rich Public & Personal Profiles (`/profile`)
- **Custom Identity:** Dynamic banner cover, overlapping avatar, verified badges, username, and role labels.
- **Stats Dashboard:** Live counters for Followers, Following, Projects, and Community Contributions.
- **Sectioned Profile Cards:**
  - **About:** Personal bio, location, and student/professional status.
  - **Skills & Interests:** Tagged capability chips with quick edit access for profile owners.
  - **Selected Projects:** Portfolio showcase linking directly to project cases.
  - **Activity Timeline:** Chronological community milestones (projects shared, discussions, badges earned).
  - **Social Links:** Connected GitHub, LinkedIn, portfolio, and social channels.
- **Followers & Following Dialogs:** Realtime inspection of the member's follower network.

### 🚀 Projects Showcase (`/projects`)
- **Project Cards:** Visual covers, category tags, project status pills (*Building*, *Launched*, *Recruiting*), and team member stacks.
- **Interactive Social Features:**
  - Upvote system with realtime Postgres change synchronization.
  - Comment threads with threaded discussions.
  - Modal quick-view and full detail routes (`/projects/[id]`).

### 📅 Events & Workshops (`/events`)
- **Calendar Schedule:** Upcoming community sessions, workshops, build sprints, and guest lectures.
- **Calendar Export:** Instant download of standard `.ics` calendar files.
- **Discord Integration:** Direct link to live Discord stages and voice channels.

### 🔔 Real-Time Notifications
- Bell counter with animated unread badge.
- Instant delivery of interactions (new followers, upvotes, project comments, event updates) via **Supabase Realtime**.
- Mark-all-read capability and direct resource navigation.

### 🎛️ Control Room (`/control-room`)
- Dedicated administrative suite for platform moderators.
- Overview analytics and metrics.
- Member role management and event curation.

---

## 🎨 Design Aesthetics

The DropOut College features a curated, editorial visual language built from first principles:

- **Deep Obsidian Forest Palette:**
  - Background: `#0B0E0C`
  - Cards & Panels: `#121714`
  - Elevated Surfaces: `#161D18`
  - Border Lines: Subdued, low-contrast `#1F2821`
- **Neon Lime Accents:**
  - Vibrant `#B4F042` / `#C6DA5E` for primary interactive elements, active navigation bars, and glowing status dots.
- **Typography:**
  - Body & Headings: Modern, clean geometric sans-serif via **Manrope**.
  - Code & Metadata: Technical monospace precision via **DM Mono**.
- **Mobile-First Layout:**
  - Responsive bottom navigation bar with active indicators.
  - Slide-out mobile drawer menu.
  - Horizontally swipeable filter pill bars.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) with Turbopack |
| **Runtime** | [React 19](https://react.dev/) + [Node.js](https://nodejs.org/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | Vanilla CSS Design Tokens (Custom Theme Engine) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, RLS, Storage) |
| **Realtime** | Supabase Postgres Changes |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 📂 Project Architecture

```text
The drop out college/
├── public/                     # Static assets (logo.svg, icons, graphics)
├── src/
│   ├── app/                    # Next.js App Router (Pages & API routes)
│   │   ├── admin/              # Admin dashboard
│   │   ├── api/v1/             # REST API endpoints (auth, projects, events, follows, etc.)
│   │   ├── control-room/       # Moderator control room
│   │   ├── dashboard/          # User personal dashboard
│   │   ├── events/             # Events directory & detail pages
│   │   ├── explore/            # Community members directory
│   │   ├── login/              # Authentication & Google OAuth
│   │   ├── profile/            # Public & owner profile view
│   │   ├── projects/           # Projects hub & project details
│   │   ├── globals.css         # Complete design system & custom CSS tokens
│   │   ├── layout.tsx          # Root layout with pre-hydration theme script
│   │   └── page.tsx            # Community homepage
│   ├── components/             # Reusable UI components
│   │   ├── app-shell.tsx       # Sidebar, Topbar, Mobile Nav, Theme Switcher
│   │   ├── cards.tsx           # MemberCard, ProjectCard, EventCard
│   │   ├── learning-network.tsx# Hero collaboration visual animation
│   │   └── social.tsx          # Community links, footer, social cards
│   ├── lib/                    # Client libraries & Supabase helpers
│   │   ├── social-client.ts    # useUpvote, useComments, useFollow hooks
│   │   ├── supabase-data.ts    # Typed data access layer
│   │   └── supabase/           # Browser & server Supabase clients
│   └── server/                 # Server-side business logic & validation
├── .env.example                # Example environment configuration
├── package.json                # Project dependencies and npm scripts
└── tsconfig.json               # TypeScript compiler configuration
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v20.x` or later (tested on Node `v24.x`)
- **Package Manager**: `npm`, `pnpm`, or `bun`

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

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Server-only, never expose to client

# Site URL (optional for local development)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Security Note:** Never commit `.env.local` to version control. The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe for browser use only when Row Level Security (RLS) is enabled.

### Running the App

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Supabase Configuration & Schema

The application connects to a Supabase PostgreSQL instance with the following primary tables:

- **`profiles`**: User information, display names, `@handle`, bio, avatars, roles (`member`, `moderator`, `admin`, `super_admin`).
- **`projects`**: Project titles, descriptions, cover images, status, metrics, external URLs.
- **`project_upvotes`**: Unique user upvotes per project.
- **`project_comments`**: User comments on projects.
- **`events`**: Scheduled events, dates, locations, calendar information.
- **`follows`**: Social follower/following graph (`follower_id` ↔ `following_id`).
- **`categories`**: Tracks (*Learn*, *Build*, *Connect*).
- **`skills`**: Skill taxonomy and member assignments.
- **`notifications`**: User notifications for social interactions.

---

## 📡 API & Health Endpoints

You can verify your backend and database connection using the built-in REST endpoints:

- `GET /api/v1/health` — Service health status check.
- `GET /api/v1/categories` — Returns available community category tracks.
- `GET /api/v1/projects` — Fetches approved community projects.
- `GET /api/v1/events` — Returns upcoming community events.
- `GET /api/v1/follows?userId=<id>` — Returns follower counts and relationship status.

---

## 🤝 Contributing

Contributions make the community better! We welcome bug fixes, design enhancements, and documentation improvements.

1. **Fork the Project**
2. **Create your Feature Branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your Changes:**
   ```bash
   git commit -m 'feat: Add amazing feature'
   ```
4. **Push to the Branch:**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

---

## 🌐 Community & Socials

Stay connected with the DropOut College ecosystem:

- 💬 **Discord:** [Join the Community Server](https://discord.gg/3xfu5TMgF)
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

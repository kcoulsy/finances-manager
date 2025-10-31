# Proposed Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route groups for authentication
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── dashboard/
│   │   ├── settings/
│   │   └── layout.tsx
│   ├── api/                      # API routes
│   │   └── routes/               # REST API routes if needed
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── features/                     # Feature-based modules (domain-driven)
│   ├── shared/                    # Shared feature utilities
│   │   ├── hooks/                 # Shared React hooks
│   │   │   ├── use-debounce.ts
│   │   │   ├── use-media-query.ts
│   │   │   └── ...
│   │   ├── components/            # Shared/global components
│   │   │   ├── ui/                 # shadcn components (auto-generated)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/             # Layout components (header, footer, sidebar)
│   │   │   ├── forms/              # Reusable form components
│   │   │   └── providers/          # Context providers
│   │   ├── lib/                   # Shared utilities and configurations
│   │   │   ├── db/                 # Prisma client and database utilities
│   │   │   │   ├── client.ts       # Singleton Prisma client
│   │   │   │   └── migrations/     # Custom migration helpers if needed
│   │   │   ├── auth/               # Better-auth configuration
│   │   │   │   ├── config.ts
│   │   │   │   └── plugins/        # Custom auth plugins
│   │   │   ├── actions/            # next-safe-action setup
│   │   │   │   └── client.ts       # Action client configuration
│   │   │   ├── utils/              # General utilities
│   │   │   │   ├── cn.ts           # className utility (for shadcn)
│   │   │   │   └── ...
│   │   │   ├── constants/          # App-wide constants
│   │   │   ├── validations/        # Shared Zod schemas
│   │   │   └── types/              # Shared TypeScript types
│   │   └── styles/                 # Global styles (if needed beyond globals.css)
│   │       └── ...
│   ├── auth/
│   │   ├── components/            # Feature-specific UI components
│   │   ├── hooks/                 # Feature-specific hooks
│   │   ├── lib/                   # Feature-specific utilities
│   │   ├── actions/               # Server actions (using next-safe-action)
│   │   │   ├── login.action.ts
│   │   │   └── register.action.ts
│   │   └── schemas/               # Zod schemas for this feature
│   │       └── auth.schema.ts
│   ├── user/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── actions/               # Server actions
│   │   └── schemas/
│   └── [feature-name]/           # Repeat pattern for each feature
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── actions/               # Server actions
│       └── schemas/
│
└── config/                       # Configuration files
    ├── env.ts                    # Environment variable validation
    └── site.ts                   # Site-wide config (name, description, etc.)
│
prisma/
├── schema.prisma                 # Prisma schema
├── migrations/                   # Migration files
└── seed.ts                       # Database seeding script
│
public/
├── assets/                       # Static assets
└── ...
```

## Key Principles:

1. **Feature-based Organization**: Each feature is self-contained with its own components, hooks, actions, and schemas
2. **Separation of Concerns**: 
   - `/features` - Business logic and domain-specific code
   - `/features/shared` - Shared utilities, components, and configurations
   - Each feature is self-contained with its own components, hooks, actions, and schemas
3. **Modularity**: Features can be easily added, removed, or refactored without affecting others
4. **Scalability**: Structure supports growth without becoming unwieldy
5. **Type Safety**: Co-located schemas and types with features that use them

## Benefits:

- **Low Coupling**: Features depend on shared utilities, not each other
- **High Cohesion**: Related code lives together
- **Easy Testing**: Features can be tested in isolation
- **Team Collaboration**: Teams can work on different features simultaneously
- **Maintainability**: Clear separation makes code easier to understand and modify


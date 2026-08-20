# ChallengeSphere Frontend — Complete Codebase Guide

> **Audience:** A software engineer with ~3 years of backend experience but limited React / React Native exposure.  
> **Goal:** After reading this doc you should be able to understand every layer of the app, trace any feature end-to-end, and confidently add your own screens, hooks, services, and components.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Tech Stack Explained](#2-tech-stack-explained)
3. [Project Structure — What Lives Where](#3-project-structure--what-lives-where)
4. [Core Concepts You Must Know](#4-core-concepts-you-must-know)
   - 4.1 [React Components & JSX](#41-react-components--jsx)
   - 4.2 [Props & State](#42-props--state)
   - 4.3 [Hooks](#43-hooks)
   - 4.4 [TypeScript Interfaces](#44-typescript-interfaces)
5. [The Data Flow — From Backend to Screen (End-to-End)](#5-the-data-flow--from-backend-to-screen-end-to-end)
6. [Layer 1 — Types (`types/api.ts`)](#6-layer-1--types-typesapits)
7. [Layer 2 — API Client (`services/apiClient.ts`)](#7-layer-2--api-client-servicesapiclientts)
8. [Layer 3 — Services (`services/*.ts`)](#8-layer-3--services-servicests)
9. [Layer 4 — Hooks (`hooks/*.ts`)](#9-layer-4--hooks-hooksts)
10. [Layer 5 — Screens (`screens/*.tsx`)](#10-layer-5--screens-screenstsx)
11. [Layer 6 — Routing (`app/` directory)](#11-layer-6--routing-app-directory)
12. [Layer 7 — Reusable Components (`components/`)](#12-layer-7--reusable-components-components)
13. [Providers — The Glue](#13-providers--the-glue)
14. [Walkthrough: "Profile" Feature End-to-End](#14-walkthrough-profile-feature-end-to-end)
15. [Walkthrough: "Feed" Feature End-to-End](#15-walkthrough-feed-feature-end-to-end)
16. [How To: Add a New Screen](#16-how-to-add-a-new-screen)
17. [How To: Add a New API Endpoint](#17-how-to-add-a-new-api-endpoint)
18. [How To: Add a New Reusable Component](#18-how-to-add-a-new-reusable-component)
19. [How To: Add Pull-to-Refresh to Any Screen](#19-how-to-add-pull-to-refresh-to-any-screen)
20. [Query Keys & Caching Explained](#20-query-keys--caching-explained)
21. [Authentication Flow](#21-authentication-flow)
22. [Media Uploads (S3)](#22-media-uploads-s3)
23. [Navigation Patterns](#23-navigation-patterns)
24. [Styling Patterns](#24-styling-patterns)
25. [Common Gotchas](#25-common-gotchas)
26. [Quick Reference: "Where Do I Change X?"](#26-quick-reference-where-do-i-change-x)

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    REACT NATIVE APP                      │
│                                                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────┐ │
│  │  Screens  │──▶│  Hooks   │──▶│     Services         │ │
│  │ (UI layer)│   │(useQuery │   │  (API call layer)    │ │
│  │           │   │useMutate)│   │                      │ │
│  └──────────┘   └──────────┘   └──────────┬───────────┘ │
│       ▲                                   │             │
│       │                                   ▼             │
│  ┌──────────┐                     ┌───────────────┐     │
│  │Components│                     │   apiClient   │     │
│  │(reusable │                     │  (Axios inst) │     │
│  │ UI parts)│                     └───────┬───────┘     │
│  └──────────┘                             │             │
│                                           ▼             │
│                                  ┌─────────────────┐    │
│                                  │  Spring Boot     │    │
│                                  │  Backend         │    │
│                                  │  :8080/api/v1    │    │
│                                  └─────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

**In one sentence:** The app is 5 thin layers — **Types → API Client → Services → Hooks → Screens** — each depending only on the one before it. Think of it like a backend: Types = POJOs, Services = Repositories, Hooks = Service layer, Screens = Controllers.

---

## 2. Tech Stack Explained

| Technology | Backend Equivalent | What It Does |
|---|---|---|
| **React Native** | — | Write "mobile apps" in JavaScript/TypeScript instead of Swift/Kotlin. One codebase → iOS + Android. |
| **Expo (SDK 54)** | Spring Boot starter | Framework on top of React Native that handles build tooling, native modules, and dev server. Think of it as "Spring Initializr but for mobile". |
| **expo-router** | Spring MVC `@RequestMapping` | File-based routing. Drop a file in `app/`, it becomes a screen you can navigate to. |
| **TypeScript** | Java with strict types | JavaScript with types. Interfaces, generics, enums — all the type safety you're used to. |
| **@tanstack/react-query** | Spring Cache + async service layer | Manages server state: fetching, caching, retrying, background refetching. You declare *what* data you need; it handles *when* to fetch. |
| **Axios** | RestTemplate / WebClient | HTTP client for making API calls. |
| **AsyncStorage** | SharedPreferences | Key-value storage persisted on the device. Used for auth tokens. |
| **React Navigation** | — | The navigation framework powering tabs, stacks, and screen transitions. |
| **NativeWind** | — | Tailwind CSS for React Native (utility-first styling). Used alongside `StyleSheet`. |

---

## 3. Project Structure — What Lives Where

```
ChallengeSphere-Frontend/
│
├── app/                          ← ROUTING LAYER (like @Controller)
│   ├── _layout.tsx               ← Root layout — wraps everything with providers
│   ├── (tabs)/                   ← Tab navigator (bottom bar)
│   │   ├── _layout.tsx           ← Tab bar configuration
│   │   ├── index.tsx             ← Home tab (shows Feed)
│   │   ├── global.tsx            ← Global challenges tab
│   │   ├── create.tsx            ← Create challenge tab
│   │   ├── challenges.tsx        ← My challenges tab
│   │   └── profile.tsx           ← Profile tab
│   ├── login.tsx                 ← Login screen
│   ├── signup.tsx                ← Signup screen
│   ├── settings.tsx              ← Settings screen
│   ├── followers.tsx             ← Followers list screen
│   ├── user-profile.tsx          ← Other user's profile
│   ├── challenge-details.tsx     ← Challenge detail screen
│   └── ...                       ← Other standalone screens
│
├── screens/                      ← SCREEN COMPONENTS (the actual UI logic)
│   ├── Feed.tsx                  ← Feed screen component
│   ├── Profile.tsx               ← Profile screen component
│   └── Settings.tsx              ← Settings screen component
│
├── components/                   ← REUSABLE UI PIECES
│   └── common/
│       ├── CircularPhoto.tsx     ← Round profile picture
│       ├── ProfileStats.tsx      ← Posts/Followers/Following counters
│       ├── FeedPhoto.tsx         ← Photo in feed post
│       ├── Header.tsx            ← App header with title
│       ├── ImageUploader.tsx     ← Camera/gallery image picker
│       └── ...                   ← Other UI components
│
├── hooks/                        ← REACT QUERY HOOKS (like @Service)
│   ├── useAuth.ts                ← Login, register, logout hooks
│   ├── useUsers.ts               ← User profile, follow, leaderboard hooks
│   ├── useChallenges.ts          ← Challenge CRUD, join, submission hooks
│   ├── useFeed.ts                ← Feed, glory, comment hooks
│   └── useMedia.ts               ← File upload hooks
│
├── services/                     ← API CALL LAYER (like @Repository)
│   ├── apiClient.ts              ← Axios instance + interceptors
│   ├── authService.ts            ← Auth API calls
│   ├── userService.ts            ← User API calls
│   ├── challengeService.ts       ← Challenge API calls
│   ├── feedService.ts            ← Feed API calls
│   └── mediaService.ts           ← S3 upload API calls
│
├── types/                        ← TYPESCRIPT INTERFACES (like Java POJOs)
│   └── api.ts                    ← All request/response types
│
├── providers/                    ← CONTEXT PROVIDERS (global state)
│   ├── QueryProvider.tsx         ← React Query setup
│   └── AuthProvider.tsx          ← Auth context (not yet implemented)
│
├── constants/                    ← Static values
├── utils/                        ← Helper functions
└── assets/                       ← Images, fonts, icons
```

### Why `app/` AND `screens/`?

Think of it this way:
- **`app/profile.tsx`** = the *route definition* (like `@GetMapping("/profile")` in Spring). It decides *that* this screen exists and *how* to navigate to it.
- **`screens/Profile.tsx`** = the *actual implementation* (like the service method the controller calls). It contains all the UI logic.

This separation lets you reuse `screens/Profile.tsx` in multiple routes if needed and keeps routing logic clean.

---

## 4. Core Concepts You Must Know

### 4.1 React Components & JSX

A **component** is just a function that returns UI. JSX looks like HTML but compiles to JavaScript.

```tsx
// This is a React component
const Greeting = () => {
  return (
    <View>
      <Text>Hello World</Text>
    </View>
  );
};
```

**Backend analogy:** A component is like a method that returns an HTML template, but it's reactive — it re-renders when its data changes.

Key React Native primitives (instead of HTML):
| React Native | HTML Equivalent |
|---|---|
| `<View>` | `<div>` |
| `<Text>` | `<p>` / `<span>` |
| `<Image>` | `<img>` |
| `<TouchableOpacity>` | `<button>` |
| `<ScrollView>` | `<div style="overflow: scroll">` |
| `<FlatList>` | Virtualized `<ul>` (only renders visible items) |
| `<TextInput>` | `<input>` |

### 4.2 Props & State

**Props** = function parameters. Data flows DOWN from parent to child.

```tsx
// Parent passes data to child via props
<ProfileStats followersCount={42} onFollowersPress={() => {}} />

// Child receives them
const ProfileStats = ({ followersCount, onFollowersPress }) => { ... }
```

**State** = mutable data inside a component. When state changes, the component re-renders.

```tsx
const [refreshing, setRefreshing] = useState(false);  // declare state
setRefreshing(true);   // update state → triggers re-render
```

### 4.3 Hooks

Hooks are functions that let components "hook into" React features. They always start with `use`.

| Hook | What It Does | Backend Analogy |
|---|---|---|
| `useState(initial)` | Local mutable state | A local variable that triggers UI update on change |
| `useEffect(() => {}, [deps])` | Side effects (runs after render) | `@PostConstruct` or a watcher |
| `useCallback(fn, [deps])` | Memoize a function | Cache a lambda |
| `useQuery(key, fn)` | Fetch & cache server data | `@Cacheable` service call |
| `useMutation(fn)` | Trigger write operations (POST/PUT/DELETE) | Service method for writes |
| `useRouter()` | Programmatic navigation | `RedirectView` |

### 4.4 TypeScript Interfaces

Exactly like Java interfaces/records. They define the shape of data.

```tsx
// This is identical in concept to a Java record
export interface User {
  id: number;
  username: string;
  bio: string | null;        // nullable
  followers: number;
  profilePicUrl: string | null;
}
```

---

## 5. The Data Flow — From Backend to Screen (End-to-End)

Here's what happens when the Profile screen loads:

```
1. Screen renders
   screens/Profile.tsx calls useUserByUsername('mihirdalal123')
                              │
2. Hook fires               ▼
   hooks/useUsers.ts → useQuery({
     queryFn: () => userService.getUserByUsername(username)
   })
                              │
3. Service makes HTTP call  ▼
   services/userService.ts → apiClient.get('/users/getUser?username=mihirdalal123')
                              │
4. API Client sends request ▼
   services/apiClient.ts → axios.get('http://192.168.0.5:8080/api/v1/users/getUser?username=...')
   - Interceptor auto-attaches Bearer token from AsyncStorage
   - Interceptor handles 401 → auto-refreshes token
                              │
5. Backend responds         ▼
   { "id": 3, "username": "mihirdalal123", "bio": "mihir", ... }
                              │
6. Data flows back up       ▼
   apiClient returns AxiosResponse → service extracts .data → hook caches it
                              │
7. Screen re-renders        ▼
   useQuery returns { data: user, isLoading: false }
   → Component reads user.username, user.bio, etc.
   → UI displays the profile
```

**Key insight:** React Query handles steps 2-6 automatically. You just write `const { data } = useUserByUsername(username)` and the data appears. It also handles:
- Caching (won't re-fetch for 5 minutes by default)
- Loading states (`isLoading`)
- Error states (`error`)
- Background refetching (refreshes stale data silently)
- Retries (retries failed requests up to 3 times)

---

## 6. Layer 1 — Types (`types/api.ts`)

**File:** `types/api.ts`  
**Backend analogy:** Your Java request/response DTOs.

This single file defines **every** TypeScript interface used across the app. It mirrors your Java backend models exactly.

### Structure:

```
types/api.ts
├── ApiResponse<T>              ← Generic API envelope
├── User                        ← Matches GET /users/getUser response
├── UpdateUserRequest           ← Matches PUT /users/{id} body
├── LoginRequest / AuthResponse ← Auth endpoints
├── Challenge                   ← Matches challenge response
├── ChallengeCreateRequest      ← Matches POST /challenges body
├── Submission                  ← Matches submission response
├── FeedItem / FeedResponse     ← Matches GET /feed response
├── FollowActionRequest         ← Matches POST /users/follow body
├── LeaderboardEntry            ← Matches leaderboard response
├── MediaFileInfo               ← S3 upload metadata
└── ... (50+ interfaces total)
```

### How to add a new type:

```tsx
// If your backend has a new endpoint POST /notifications
// that accepts { userId: number, type: string }
// and returns { notificationId: number, message: string, read: boolean }

// Add to types/api.ts:
export interface CreateNotificationRequest {
  userId: number;
  type: string;
}

export interface NotificationResponse {
  notificationId: number;
  message: string;
  read: boolean;
}
```

**Rule:** Always match the backend response exactly. Use `curl` to hit the endpoint and model the TypeScript interface on what you get back.

---

## 7. Layer 2 — API Client (`services/apiClient.ts`)

**File:** `services/apiClient.ts`  
**Backend analogy:** Your `RestTemplate` bean with interceptors.

This is a **singleton** Axios instance that every service uses. You should almost never modify this file.

### What it does:

```tsx
class ApiClient {
  private instance: AxiosInstance;  // The actual HTTP client

  constructor() {
    this.instance = axios.create({
      baseURL: 'http://192.168.0.5:8080/api/v1',  // ← Your backend URL
      timeout: 30000,                               // ← 30 second timeout
      headers: { 'Content-Type': 'application/json' }
    });
    this.setupInterceptors();
  }
}
```

### Request Interceptor (auto-attaches auth token):

Every outgoing request automatically gets a `Bearer` token from device storage:

```
Request → Interceptor reads token from AsyncStorage → Adds Authorization header → Sends to backend
```

### Response Interceptor (auto-refreshes expired tokens):

```
Response 401 → Reads refresh token → Calls /auth/refresh → Stores new token → Retries original request
```

This means **you never need to handle auth tokens in your services or screens.** The API client handles it transparently.

### When to change this file:

- **Change the backend URL:** Edit `API_BASE_URL`
- **Add a global header:** Add it to the constructor's `headers`
- **Change timeout:** Edit `timeout`
- **That's it.** Everything else should go in services.

---

## 8. Layer 3 — Services (`services/*.ts`)

**Backend analogy:** `@Repository` or DAO classes.

Each service is a **singleton class** that groups related API calls. They use `apiClient` to make HTTP requests and return typed responses.

### Pattern (every method looks like this):

```tsx
async getUserByUsername(username: string): Promise<UserProfileResponse> {
  try {
    const response = await apiClient.get<UserProfileResponse>(   // ← HTTP method
      `/users/getUser?username=${username}`                       // ← URL path
    );
    return response.data;                                         // ← Extract body
  } catch (error) {
    console.error('Get user by username error:', error);          // ← Log error
    throw error;                                                  // ← Re-throw for hook
  }
}
```

### Available services:

| Service | Responsibility | Key Methods |
|---|---|---|
| `authService` | Login, register, logout, token refresh | `login()`, `register()`, `logout()`, `refreshToken()` |
| `userService` | User profiles, follows, leaderboard, block/report | `getUserByUsername()`, `followAction()`, `getLeaderboard()` |
| `challengeService` | Challenge CRUD, join/leave, submissions | `createChallenge()`, `joinChallenge()`, `createSubmission()` |
| `feedService` | Feed listing, glory (likes), comments | `getExploreFeed()`, `toggleGlory()`, `addComment()` |
| `mediaService` | S3 presigned URL generation, file upload | `generatePresignedUrls()`, `uploadToPresignedUrl()` |

### How to add a new service method:

```tsx
// In services/userService.ts, add:
async getNotifications(userId: number, page = 1): Promise<NotificationResponse[]> {
  try {
    const response = await apiClient.get<NotificationResponse[]>(
      `/users/${userId}/notifications?page=${page}`
    );
    return response.data;
  } catch (error) {
    console.error('Get notifications error:', error);
    throw error;
  }
}
```

---

## 9. Layer 4 — Hooks (`hooks/*.ts`)

**Backend analogy:** `@Service` layer with caching.

Hooks are the bridge between services (raw API calls) and screens (UI). They wrap service calls in React Query's `useQuery` (for reads) and `useMutation` (for writes).

### `useQuery` — For Reading Data (GET requests)

```tsx
export const useUserByUsername = (username: string) => {
  return useQuery({
    queryKey: userKeys.byUsername(username),   // ← Cache key (like @Cacheable key)
    queryFn: () => userService.getUserByUsername(username),  // ← What to fetch
    enabled: !!username && username.length > 0,  // ← Only fetch if username exists
    retry: 2,                                    // ← Retry twice on failure
    retryDelay: 1000,                           // ← Wait 1s between retries
  });
};
```

**What `useQuery` returns:**

```tsx
const {
  data,        // The response data (undefined while loading)
  isLoading,   // true on first fetch
  error,       // Error object if request failed
  refetch,     // Function to manually re-fetch
  isRefetching // true when refetching in background
} = useUserByUsername('mihirdalal123');
```

### `useMutation` — For Writing Data (POST/PUT/DELETE)

```tsx
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, userData }) =>
      userService.updateUser(userId, userData),    // ← The API call
    onSuccess: (updatedUser) => {
      // Invalidate cache so UI refreshes with new data
      queryClient.invalidateQueries({ queryKey: userKeys.detail(updatedUser.id) });
    },
  });
};
```

**What `useMutation` returns:**

```tsx
const updateUser = useUpdateUser();

// Trigger the mutation:
updateUser.mutate({ userId: 3, userData: { bio: 'new bio' } });

// Or with async/await:
const result = await updateUser.mutateAsync({ userId: 3, userData: { bio: 'new bio' } });
```

### How to add a new hook:

```tsx
// In hooks/useUsers.ts:

// 1. Add a query key
export const userKeys = {
  // ...existing keys...
  notifications: (userId: number) => [...userKeys.all, 'notifications', userId] as const,
};

// 2. Add the hook
export const useNotifications = (userId: number, page = 1) => {
  return useQuery({
    queryKey: [...userKeys.notifications(userId), page],
    queryFn: () => userService.getNotifications(userId, page),
    enabled: !!userId && userId > 0,
  });
};
```

---

## 10. Layer 5 — Screens (`screens/*.tsx`)

**Backend analogy:** The "view" or template. But unlike server-rendered HTML, these are *reactive* — they re-render when data changes.

### Pattern:

```tsx
const MyScreen = ({ someParam }) => {
  // 1. HOOKS — Fetch data, set up state
  const { data, isLoading, error, refetch } = useSomeHook(someParam);
  const [localState, setLocalState] = useState(initialValue);

  // 2. HANDLERS — Functions for user interactions
  const handlePress = () => { /* do something */ };

  // 3. CONDITIONAL RENDERING — Loading, error, empty states
  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Error!</Text>;

  // 4. MAIN UI — The actual screen
  return (
    <SafeAreaView>
      {/* UI components using data */}
    </SafeAreaView>
  );
};
```

### Current screens:

| Screen | File | Data Source | Description |
|---|---|---|---|
| Feed | `screens/Feed.tsx` | `useExploreFeed()` | Shows feed items in a scrollable list |
| Profile | `screens/Profile.tsx` | `useUserByUsername()` | Current user's profile with pull-to-refresh |
| Settings | `screens/Settings.tsx` | Local | Settings list |

---

## 11. Layer 6 — Routing (`app/` directory)

**Backend analogy:** `@RequestMapping` annotations — but file-based.

Expo Router uses the filesystem to define routes. Every `.tsx` file in `app/` becomes a navigable screen.

### How file → route mapping works:

| File | Route URL | Navigation |
|---|---|---|
| `app/(tabs)/index.tsx` | `/` (Home tab) | Default tab |
| `app/(tabs)/profile.tsx` | `/profile` (Profile tab) | Tab bar |
| `app/settings.tsx` | `/settings` | `router.push('/settings')` |
| `app/followers.tsx` | `/followers` | `router.push('/followers')` |
| `app/user-profile.tsx` | `/user-profile` | `router.push('/user-profile')` |
| `app/challenge-details.tsx` | `/challenge-details` | `router.push('/challenge-details')` |

### Special files:

- **`_layout.tsx`** — Wraps all sibling routes in a layout (navigation container, providers, etc.)
- **`+not-found.tsx`** — 404 page

### The `(tabs)` folder:

The parentheses `(tabs)` make it a **layout group** — it wraps child routes in a `<Tabs>` navigator (the bottom tab bar) without affecting the URL.

```
app/
├── _layout.tsx          ← Root: wraps everything in QueryProvider + ThemeProvider
├── (tabs)/
│   ├── _layout.tsx      ← Tab bar: defines 5 tabs (Home, Global, Create, Challenges, Profile)
│   ├── index.tsx        ← Home tab → renders <Feed />
│   └── profile.tsx      ← Profile tab → renders <Profile username="mihirdalal123" />
```

### Navigation in code:

```tsx
import { useRouter } from 'expo-router';

const MyComponent = () => {
  const router = useRouter();

  // Navigate to a screen:
  router.push('/settings');

  // Navigate with params:
  router.push({ pathname: '/user-profile', params: { userId: '3' } });

  // Go back:
  router.back();
};
```

### How tab files delegate to screens:

Tab files are **thin wrappers**. They import the actual screen component and pass props:

```tsx
// app/(tabs)/profile.tsx — THIN WRAPPER
const ProfileTab = () => {
  const router = useRouter();
  return (
    <Profile
      username="mihirdalal123"
      onFollowersPress={() => router.push('/followers')}
      onSettingsPress={() => router.push('/settings')}
    />
  );
};
```

```tsx
// screens/Profile.tsx — ACTUAL IMPLEMENTATION
const Profile = ({ username, onFollowersPress, onSettingsPress }) => {
  const { data: user } = useUserByUsername(username);
  return (/* full UI */);
};
```

---

## 12. Layer 7 — Reusable Components (`components/`)

**Backend analogy:** Utility classes / shared DTOs.

Small, focused UI pieces that multiple screens use. They receive data via props and have no knowledge of services or hooks.

### Key components:

| Component | Props | What It Renders |
|---|---|---|
| `CircularPhoto` | `source`, `size`, `borderWidth`, `borderColor` | Round profile picture |
| `ProfileStats` | `postsCount`, `followersCount`, `followingCount`, `challengesCount` + press handlers | Stats row (42 Posts | 100 Followers | ...) |
| `FeedPhoto` | `photoUrl` | Photo card in feed |
| `PhotoAndUserName` | `photoUrl`, `userName` | Avatar + username row |
| `ChallengeSummary` | `challengeName`, `title` | Challenge name + description |
| `GenuinityAndCount` | `genuineCount`, press handlers | Like/dislike buttons with counts |
| `CommentAndCount` | `commentCount`, `onCommentSubmit` | Comment icon + count |
| `Header` | none | App header "challengesphere" with notification bell |
| `Separator` | none | Horizontal line |
| `ImageUploader` | `userId`, `maxImages`, callbacks | Camera/gallery picker with upload progress |

### How to create a component:

```tsx
// components/common/Badge.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BadgeProps {
  label: string;
  color?: string;
}

const Badge: React.FC<BadgeProps> = ({ label, color = '#FFD700' }) => {
  return (
    <View style={[styles.container, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Badge;
```

---

## 13. Providers — The Glue

Providers wrap the entire app and make services available to all components without prop-drilling.

### `QueryProvider` (`providers/QueryProvider.tsx`)

Creates a React Query client with default settings and wraps the app:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // Data is "fresh" for 5 minutes
      gcTime: 10 * 60 * 1000,     // Keep unused data in cache for 10 minutes
      retry: (failureCount, error) => {
        // Don't retry 4xx errors (except 401)
        if (error?.response?.status >= 400 && error?.response?.status < 500 && error?.response?.status !== 401) {
          return false;
        }
        return failureCount < 3;   // Retry up to 3 times
      },
    },
  },
});
```

**Backend analogy:** This is like configuring your `@Cacheable` defaults — how long to cache, when to evict, when to retry.

### How it's wired in `app/_layout.tsx`:

```tsx
export default function RootLayout() {
  return (
    <QueryProvider>           {/* ← Makes React Query available everywhere */}
      <ThemeProvider value={DarkTheme}>
        <Stack>               {/* ← Stack navigator for screen transitions */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </QueryProvider>
  );
}
```

---

## 14. Walkthrough: "Profile" Feature End-to-End

Let's trace exactly what happens when you open the Profile tab:

### Step 1: Route triggers
User taps the Profile tab → expo-router loads `app/(tabs)/profile.tsx`:

```tsx
// app/(tabs)/profile.tsx
const ProfileTab = () => {
  return <Profile username="mihirdalal123" />;
};
```

### Step 2: Screen component mounts
`screens/Profile.tsx` renders and calls the hook:

```tsx
const { data: user, isLoading, error, refetch } = useUserByUsername('mihirdalal123');
```

### Step 3: Hook fires query
`hooks/useUsers.ts` → `useQuery` checks cache:
- **Cache hit (data < 5 min old):** Returns cached data instantly. No API call.
- **Cache miss:** Calls `userService.getUserByUsername('mihirdalal123')`.

### Step 4: Service makes HTTP call
`services/userService.ts`:
```
GET http://192.168.0.5:8080/api/v1/users/getUser?username=mihirdalal123
```

### Step 5: API client adds auth header
`services/apiClient.ts` interceptor adds:
```
Authorization: Bearer <token-from-AsyncStorage>
```

### Step 6: Backend responds
```json
{"id": 3, "username": "mihirdalal123", "bio": "mihir", "followers": 0, ...}
```

### Step 7: Data flows back
- `apiClient` returns `AxiosResponse`
- `userService.getUserByUsername()` returns `response.data` (the User object)
- `useQuery` stores it in cache with key `['users', 'username', 'mihirdalal123']`
- `useQuery` returns `{ data: user, isLoading: false, error: null }`

### Step 8: Screen renders
```tsx
if (isLoading) → show spinner
if (error)     → show "Failed to load" + retry button
if (user)      → show profile: @mihirdalal123, bio, stats, etc.
```

### Step 9: Pull-to-refresh
User swipes down → `onRefresh` calls `refetch()` → Hook re-fetches from API → Screen re-renders with fresh data.

---

## 15. Walkthrough: "Feed" Feature End-to-End

### Step 1: `app/(tabs)/index.tsx`
```tsx
<Feed />
```

### Step 2: `screens/Feed.tsx`
```tsx
const { data, isLoading, error } = useExploreFeed(1, 20);
const toggleGlory = useToggleGlory();
```

### Step 3: `hooks/useFeed.ts` → `useExploreFeed`
```tsx
queryFn: () => feedService.getExploreFeed(page, pageSize)
```

### Step 4: `services/feedService.ts`
```
GET /feed?page=1&pageSize=20&feedType=EXPLORE
```

### Step 5: Response renders in FlatList
```tsx
<FlatList
  data={data?.items || []}
  renderItem={({ item }) => (
    <View>
      <PhotoAndUserName photoUrl={...} userName={item.username} />
      <FeedPhoto photoUrl={...} />
      <GenuinityAndCount genuineCount={item.gloriesCount} />
    </View>
  )}
/>
```

### Liking a post (mutation):
```tsx
// User presses "glory" button
handleGloryPress(submissionId, userId)
  → toggleGlory.mutate({ submissionId, userId })
  → feedService.toggleGlory(submissionId, userId)     // POST /feed/{id}/glory
  → onSettled: invalidates feed cache                  // UI refreshes
```

---

## 16. How To: Add a New Screen

**Example:** Add a "Notifications" screen accessible from the home tab.

### Step 1: Define types (if needed)
```tsx
// types/api.ts
export interface Notification {
  id: number;
  userId: number;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}
```

### Step 2: Add service method
```tsx
// services/userService.ts — add inside the class:
async getNotifications(userId: number, page = 1, pageSize = 20): Promise<Notification[]> {
  try {
    const response = await apiClient.get<Notification[]>(
      `/users/${userId}/notifications?page=${page}&pageSize=${pageSize}`
    );
    return response.data;
  } catch (error) {
    console.error('Get notifications error:', error);
    throw error;
  }
}
```

### Step 3: Add hook
```tsx
// hooks/useUsers.ts — add query key:
notifications: (userId: number) => [...userKeys.all, 'notifications', userId] as const,

// Add hook:
export const useNotifications = (userId: number, page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: [...userKeys.notifications(userId), page, pageSize],
    queryFn: () => userService.getNotifications(userId, page, pageSize),
    enabled: !!userId && userId > 0,
  });
};
```

### Step 4: Create screen component
```tsx
// screens/Notifications.tsx
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '../hooks/useUsers';

interface NotificationsProps {
  userId: number;
}

const Notifications = ({ userId }: NotificationsProps) => {
  const { data, isLoading, error } = useNotifications(userId);

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error loading notifications</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data || []}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.message}>{item.message}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  item: { padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  message: { color: '#fff', fontSize: 14 },
});

export default Notifications;
```

### Step 5: Create route file
```tsx
// app/notifications.tsx
import Notifications from '@/screens/Notifications';

export default function NotificationsPage() {
  return <Notifications userId={3} />;
}
```

### Step 6: Navigate to it
```tsx
// Anywhere in the app:
router.push('/notifications');
```

---

## 17. How To: Add a New API Endpoint

**Full checklist — follow these 4 steps in order:**

1. **`types/api.ts`** — Add request/response interfaces
2. **`services/xxxService.ts`** — Add the async method
3. **`hooks/useXxx.ts`** — Add query key + `useQuery`/`useMutation` hook
4. **`screens/Xxx.tsx`** — Call the hook and render data

```
types → service → hook → screen
(Define) (Fetch) (Cache)  (Render)
```

---

## 18. How To: Add a New Reusable Component

### Rules:
1. Components go in `components/common/`
2. They receive all data via **props** (no hooks calling services inside)
3. They must be **stateless or self-contained** (internal state is OK, server state is not)
4. They have their own `StyleSheet`

### Template:
```tsx
// components/common/MyComponent.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface MyComponentProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, subtitle, onPress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { /* ... */ },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  subtitle: { color: '#888', fontSize: 13 },
});

export default MyComponent;
```

---

## 19. How To: Add Pull-to-Refresh to Any Screen

This is a very common pattern in the app. Here's the recipe:

```tsx
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

const MyScreen = () => {
  const { data, refetch } = useSomeHook();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FFD700"     // Spinner color (iOS)
          colors={['#FFD700']}   // Spinner color (Android)
        />
      }
    >
      {/* Your content */}
    </ScrollView>
  );
};
```

**For `FlatList`** (which is a `ScrollView` internally), use the same pattern:
```tsx
<FlatList
  data={data}
  renderItem={...}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
/>
```

---

## 20. Query Keys & Caching Explained

React Query uses **query keys** as cache identifiers — exactly like `@Cacheable(key = "...")` in Spring.

### How keys work:

```tsx
export const userKeys = {
  all: ['users'],                                    // All user-related caches
  detail: (id) => ['users', 'detail', id],           // One user by ID
  byUsername: (username) => ['users', 'username', username],  // One user by username
  followers: (id) => ['users', 'followers', id],     // User's followers list
};
```

### Invalidation (cache busting):

When you mutate data, you **invalidate** related queries so they refetch:

```tsx
// After following a user:
queryClient.invalidateQueries({ queryKey: userKeys.followers(userId) });
// → React Query refetches the followers list → UI updates
```

### Cache hierarchy:

```
invalidateQueries({ queryKey: ['users'] })
  → Invalidates EVERYTHING under 'users': detail, byUsername, followers, following, etc.

invalidateQueries({ queryKey: ['users', 'detail', 3] })
  → Invalidates ONLY user ID 3's detail
```

---

## 21. Authentication Flow

### Login:
```
User enters credentials
  → useLogin().mutate({ username, password })
  → authService.login()
  → POST /auth/login
  → Backend returns { accessToken, refreshToken, ... }
  → authService stores tokens in AsyncStorage
  → queryClient invalidates all queries (fresh data for new user)
```

### Auto-auth on every request:
```
Any API call → apiClient interceptor
  → reads token from AsyncStorage
  → adds Authorization: Bearer <token>
  → if 401: auto-refresh token → retry original request
  → if refresh fails: clear tokens → redirect to login
```

### Logout:
```
useLogout().mutate()
  → POST /auth/logout
  → Clear AsyncStorage (tokens + user data)
  → Invalidate all queries
```

---

## 22. Media Uploads (S3)

The app uses **Amazon S3** with **presigned URLs** for file uploads:

```
1. Frontend requests presigned URL:
   POST /submissions/presignedUrls
   Body: { userId: 3, mediaFiles: [{ fileName: "photo.jpg", mediaType: "IMAGE", contentType: "image/jpeg" }] }

2. Backend generates a signed URL and returns it:
   { presignedUrl: "https://bucket.s3.region.amazonaws.com/users/3/photo.jpg?X-Amz-Signature=...", fileKey: "users/3/photo.jpg" }

3. Frontend uploads directly to S3:
   PUT <presignedUrl> with file bytes (bypasses your backend entirely)

4. Frontend stores the object key or unsigned S3 object URL; the backend signs reads:
   users/3/photo.jpg
```

### Using `ImageUploader` component:
```tsx
<ImageUploader
  userId={3}
  maxImages={5}
  onUploadComplete={(urls) => console.log('Uploaded:', urls)}
  onUploadError={(err) => console.error('Failed:', err)}
/>
```

---

## 23. Navigation Patterns

### Stack Navigation (push/pop):
```tsx
router.push('/settings');        // Push new screen on top
router.back();                   // Go back one screen
router.replace('/login');        // Replace current screen (no back)
```

### Tab Navigation (built-in):
Defined in `app/(tabs)/_layout.tsx`. Five tabs: Home, Global, Create, Challenges, Profile.

### Passing data between screens:
```tsx
// Navigate with params:
router.push({ pathname: '/user-profile', params: { userId: '42' } });

// Receive params in target screen:
import { useLocalSearchParams } from 'expo-router';
const { userId } = useLocalSearchParams();
```

---

## 24. Styling Patterns

The app uses **React Native's `StyleSheet`** (not CSS). It's similar to CSS but uses camelCase and flexbox by default.

### Key differences from CSS:

| CSS | React Native |
|---|---|
| `background-color` | `backgroundColor` |
| `font-size: 16px` | `fontSize: 16` (no `px`) |
| `display: block` | Everything is `flex` by default |
| `flex-direction: row` | Default is `column` (vertical) |
| `class="..."` | `style={styles.xxx}` |
| `:hover` | `<TouchableOpacity>` |
| `border: 1px solid #333` | `borderWidth: 1, borderColor: '#333'` |

### App's design tokens:
```tsx
// Colors used throughout the app:
'#000'      // Background (pure black)
'#0F0D23'   // Tab bar background (dark violet)
'#FFD700'   // Accent color (gold — loading spinners, buttons)
'#4700ecff' // Active tab icon (violet)
'#00ff37ff' // Create tab icon (green)
'#fff'      // Primary text
'#888'      // Secondary text
'#ff4444'   // Error text
'#4CAF50'   // Success/genuineness text (green)
'#333'      // Borders
```

---

## 25. Common Gotchas

### 1. "Network Error" on Android emulator
Android blocks HTTP (non-HTTPS) traffic by default. **Fix:** `app.json` → `"android": { "usesCleartextTraffic": true }`. Already done in this project.

### 2. `localhost` doesn't work from devices
`localhost` on a mobile device/emulator refers to the device itself, not your Mac. **Fix:** Use your Mac's LAN IP (currently `192.168.0.5`). Set it in `services/apiClient.ts`.

### 3. Data not refreshing
React Query caches data for 5 minutes (`staleTime`). To force refresh:
- Pull-to-refresh (calls `refetch()`)
- Invalidate the query after a mutation: `queryClient.invalidateQueries({ queryKey: [...] })`

### 4. Exports — `default` vs named
- **Components:** `export default MyComponent` → `import MyComponent from '...'`
- **Hooks:** `export const useXxx = ...` → `import { useXxx } from '...'`
- **Services:** `export const xxxService = new XxxService()` → `import { xxxService } from '...'`

### 5. Routes must export a default component
Every file in `app/` **must** `export default` a React component. If it doesn't, you'll see: *"Route ./xxx.tsx is missing the required default export."*

### 6. Don't call hooks conditionally
```tsx
// ❌ WRONG — hooks must always be called in the same order
if (userId) {
  const { data } = useUser(userId);
}

// ✅ RIGHT — use the `enabled` option
const { data } = useUser(userId); // Hook defined with enabled: !!userId
```

---

## 26. Quick Reference: "Where Do I Change X?"

| I want to... | File to edit |
|---|---|
| Change the backend URL | `services/apiClient.ts` → `API_BASE_URL` |
| Add a new API endpoint type | `types/api.ts` |
| Add a new API call | `services/xxxService.ts` |
| Add a new cached data hook | `hooks/useXxx.ts` |
| Add a new screen | `screens/Xxx.tsx` + `app/xxx.tsx` |
| Add a new tab | `app/(tabs)/xxx.tsx` + update `app/(tabs)/_layout.tsx` |
| Add a reusable UI component | `components/common/Xxx.tsx` |
| Change caching behavior | `providers/QueryProvider.tsx` |
| Change auth token handling | `services/apiClient.ts` interceptors |
| Change app name/icon | `app.json` |
| Add a new font | `assets/fonts/` + load in `app/_layout.tsx` |
| Fix Android-specific config | `app.json` → `"android": { ... }` |
| Fix iOS-specific config | `app.json` → `"ios": { ... }` |

---

## Appendix: File Dependency Graph

```
types/api.ts
    ↓ (imported by)
services/apiClient.ts ←── services/authService.ts
                      ←── services/userService.ts
                      ←── services/challengeService.ts
                      ←── services/feedService.ts
                      ←── services/mediaService.ts
    ↓ (imported by)
hooks/useAuth.ts
hooks/useUsers.ts
hooks/useChallenges.ts
hooks/useFeed.ts
hooks/useMedia.ts
    ↓ (imported by)
screens/Profile.tsx
screens/Feed.tsx
screens/Settings.tsx
    ↓ (imported by)
app/(tabs)/profile.tsx
app/(tabs)/index.tsx
app/settings.tsx
```

Every arrow points *downward*. Lower layers never import from upper layers. This is the same principle as clean architecture in backend systems.

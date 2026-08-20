# ChallengeSphere API Documentation

> Base URL: `http://your-server:8080/api/v1`

## Table of Contents
- [User APIs](#user-apis)
- [Challenge APIs](#challenge-apis)
- [Submission APIs](#submission-apis)
- [Feed APIs](#feed-apis)
- [Glory APIs](#glory-apis)
- [Comment APIs](#comment-apis)
- [Leaderboard APIs](#leaderboard-apis)

---

## User APIs

Base Path: `/api/v1/users`

### 1. Register User
```
POST /api/v1/users/register
```
**Request Body:**
```json
{
  "username": "string (required)",
  "email": "string (required)",
  "password": "string (required)",
  "phone": "string (optional)"
}
```
**Response:** `UserRegistrationResponse`

---

### 2. Get User
```
GET /api/v1/users/getUser
```
**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | Long | No* | User ID |
| emailId | String | No* | Email address |
| phone | String | No* | Phone number |
| username | String | No* | Username |

*At least one parameter is required

**Response:** `User` object

---

### 3. Update User Details
```
PUT /api/v1/users/updateUserDetails
```
**Request Body:**
```json
{
  "userId": "Long (required)",
  "username": "string (optional)",
  "profilePicUrl": "string (optional)",
  "bio": "string (optional)"
}
```
**Response:** `User` object

---

### 4. Follow User
```
POST /api/v1/users/follow?followerId={id}&followingId={id}
```
**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| followerId | Long | Yes | ID of user who is following |
| followingId | Long | Yes | ID of user being followed |

**Response:** `FollowActionResponse`

---

### 5. Unfollow User
```
POST /api/v1/users/unfollow?followerId={id}&followingId={id}
```
**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| followerId | Long | Yes | ID of user who is unfollowing |
| followingId | Long | Yes | ID of user being unfollowed |

**Response:** `FollowActionResponse`

---

### 6. Get Followers
```
POST /api/v1/users/getFollowers
```
**Request Body:**
```json
{
  "userId": "Long (required)",
  "page": 1,
  "pageSize": 10
}
```
**Response:** `FollowersFollowingResponse`

---

### 7. Get Following
```
POST /api/v1/users/getFollowing
```
**Request Body:**
```json
{
  "userId": "Long (required)",
  "page": 1,
  "pageSize": 10
}
```
**Response:** `FollowersFollowingResponse`

---

### 8. Toggle User Activation
```
PUT /api/v1/users/toggleActivation
```
**Request Body:**
```json
{
  "userId": "Long (required)",
  "active": "boolean (required)"
}
```
**Response:** `ToggleUserActivationResponse`

---

## Challenge APIs

Base Path: `/api/v1/challenges`

### 1. Create Challenge
```
POST /api/v1/challenges/create
```
**Request Body:**
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "creatorUserId": "Long (required)",
  "numberOfDays": "Integer (required)",
  "hashtags": "string (optional)",
  "categories": "string (optional)",
  "benefits": "string (optional)",
  "isPrivate": "boolean (optional, default: false)",
  "startDate": "YYYY-MM-DD (optional, default: today)"
}
```
**Response:** `ChallengeCreateResponse`

---

### 2. Get User Challenges
```
POST /api/v1/challenges/getUserChallenges
```
**Request Body:**
```json
{
  "userId": "Long (required)",
  "page": 1,
  "pageSize": 10,
  "active": "boolean (optional)"
}
```
**Response:** `UserChallengesResponse`

---

### 3. Get Challenges By IDs
```
POST /api/v1/challenges/getByIds
```
**Request Body:**
```json
[1, 2, 3, 4, 5]
```
**Response:** `List<Challenge>`

---

### 4. Delete Challenges
```
PUT /api/v1/challenges/deleteChallenges
```
**Request Body:**
```json
{
  "challengeIds": [1, 2, 3]
}
```
**Response:** `200 OK`

---

### 5. Disable Challenges for Users
```
PUT /api/v1/challenges/bulkDisableByUsers
```
**Request Body:**
```json
{
  "userIds": [1, 2, 3]
}
```
**Response:** `String` message

---

### 6. Join Challenge
```
POST /api/v1/challenges/joinChallenge
```
**Request Body:**
```json
{
  "challengeId": "Long (required)",
  "userIds": [1, 2, 3]
}
```
**Response:** `JoinChallengeResponse`

---

### 7. Leave Challenge
```
POST /api/v1/challenges/leaveChallenge
```
**Request Body:**
```json
{
  "challengeId": "Long (required)",
  "userIds": [1, 2, 3]
}
```
**Response:** `LeaveChallengeResponse`

---

### 8. Get Challenge Participants
```
POST /api/v1/challenges/getParticipants
```
**Request Body:**
```json
{
  "challengeId": "Long (required)"
}
```
**Response:** `ChallengeParticipantsResponse`

---

### 9. Get Challenges by Hashtags
```
GET /api/v1/challenges/byHashtags?hashtags={tags}&page={page}&pageSize={size}
```
**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| hashtags | List<String> | Yes | - | Hashtags to search |
| page | int | No | 1 | Page number |
| pageSize | int | No | 10 | Items per page |

**Response:** `ChallengesByHashtagResponse`

---

### 10. Get Popular Challenges
```
GET /api/v1/challenges/popular
```
**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| active | Boolean | No | - | Filter by active status |
| startDate | String | No | - | Start date (YYYY-MM-DD) |
| endDate | String | No | - | End date (YYYY-MM-DD) |
| page | int | No | 1 | Page number |
| pageSize | int | No | 10 | Items per page |

**Response:** `PopularChallengesResponse`

---

### 11. Get Recent Challenges
```
GET /api/v1/challenges/recent?page={page}&pageSize={size}
```
**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | int | No | 1 | Page number |
| pageSize | int | No | 10 | Items per page (max 100) |

**Response:** `RecentChallengesResponse`

---

### 12. Get Trending Challenge IDs
```
GET /api/v1/challenges/trending/ids?limit={limit}
```
**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | int | No | 10 | Max results (max 100) |

**Response:** `List<Long>` - Challenge IDs

---

## Submission APIs

Base Path: `/api/v1/submissions`

### 1. Create Submission
```
POST /api/v1/submissions
```
**Request Body:**
```json
{
  "userId": "Long (required)",
  "challengeId": "Long (required)",
  "dayNumber": "Integer (required)",
  "description": "string (optional)",
  "mediaUrls": "string (optional, comma-separated)",
  "isPrivate": "boolean (optional, default: false)"
}
```
**Response:** `SubmissionResponse`

---

### 2. Generate Presigned URLs for Media Upload
```
POST /api/v1/submissions/presignedUrls
```
**Request Body:**
```json
{
  "userId": "Long (required)",
  "challengeId": "Long (required)",
  "mediaFiles": [
    {
      "fileName": "image1.jpg",
      "contentType": "image/jpeg",
      "fileSize": 1024000
    }
  ]
}
```
**Response:** `PresignedUrlsResponse`

---

### 3. Get Submissions by User and Challenge
```
GET /api/v1/submissions/user/{userId}/challenge/{challengeId}?page={page}&pageSize={size}
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | Long | User ID |
| challengeId | Long | Challenge ID |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 1 | Page number |
| pageSize | int | 10 | Items per page |

**Response:** `SubmissionsResponse`

---

### 4. Get Submissions by Challenge
```
GET /api/v1/submissions/challenge/{challengeId}?page={page}&pageSize={size}
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| challengeId | Long | Challenge ID |

**Response:** `SubmissionsResponse`

---

### 5. Get Submissions by User
```
GET /api/v1/submissions/user/{userId}?page={page}&pageSize={size}
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | Long | User ID |

**Response:** `SubmissionsResponse`

---

## Feed APIs

Base Path: `/api/v1/feed`

### 1. Get Feed (Generic)
```
POST /api/v1/feed
```
**Request Body:**
```json
{
  "userId": "Long (required)",
  "feedType": "FOLLOWING | TRENDING | EXPLORE",
  "page": 1,
  "pageSize": 20,
  "lastSeenSubmissionId": "Long (optional, for cursor pagination)"
}
```
**Response:** `FeedResponse`

---

### 2. Get Following Feed
```
GET /api/v1/feed/following/{userId}?page={page}&pageSize={size}
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | Long | Current user ID |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 1 | Page number |
| pageSize | int | 20 | Items per page |

**Response:** `FeedResponse` - Submissions from followed users

---

### 3. Get Trending Feed
```
GET /api/v1/feed/trending?page={page}&pageSize={size}&userId={userId}
```
**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | int | No | 1 | Page number |
| pageSize | int | No | 20 | Items per page |
| userId | Long | No | - | For personalization (glory status) |

**Response:** `FeedResponse` - Popular submissions by engagement

---

### 4. Get Explore Feed
```
GET /api/v1/feed/explore?page={page}&pageSize={size}&userId={userId}
```
**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | int | No | 1 | Page number |
| pageSize | int | No | 20 | Items per page |
| userId | Long | No | - | For personalization |

**Response:** `FeedResponse` - All public submissions (newest first)

---

### 5. Get Challenge Feed
```
GET /api/v1/feed/challenge/{challengeId}?page={page}&pageSize={size}&userId={userId}
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| challengeId | Long | Challenge ID |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | int | No | 1 | Page number |
| pageSize | int | No | 20 | Items per page |
| userId | Long | No | - | For personalization |

**Response:** `FeedResponse` - Submissions for specific challenge

---

### 6. Get User Feed (Profile)
```
GET /api/v1/feed/user/{targetUserId}?page={page}&pageSize={size}&currentUserId={id}
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| targetUserId | Long | User whose submissions to fetch |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | int | No | 1 | Page number |
| pageSize | int | No | 20 | Items per page |
| currentUserId | Long | No | - | For authorization (own profile shows all) |

**Response:** `FeedResponse` - User's submissions

---

## Glory APIs

Base Path: `/api/v1/glories`

### 1. Toggle Glory (Like)
```
POST /api/v1/glories/toggle?submissionId={id}&userId={id}
```
**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| submissionId | Long | Yes | Submission ID |
| userId | Long | Yes | User giving/removing glory |

**Response:** `Boolean` - `true` if glory given, `false` if removed

---

### 2. Get Glories for Submission
```
GET /api/v1/glories/submission/{submissionId}
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| submissionId | Long | Submission ID |

**Response:** `List<Glory>`

---

### 3. Check if User Gave Glory
```
GET /api/v1/glories/check?submissionId={id}&userId={id}
```
**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| submissionId | Long | Yes | Submission ID |
| userId | Long | Yes | User ID |

**Response:** `Boolean`

---

### 4. Get Glory Count
```
GET /api/v1/glories/count/{submissionId}
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| submissionId | Long | Submission ID |

**Response:** `Long` - Glory count

---

## Comment APIs

Base Path: `/api/v1/comments`

### 1. Get Comments for Submission
```
GET /api/v1/comments/submission/{submissionId}?page={page}&size={size}
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| submissionId | Long | Submission ID |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 0 | Page number (0-indexed) |
| size | int | 20 | Items per page |

**Response:** `Page<Comment>`

---

### 2. Create Comment
```
POST /api/v1/comments?submissionId={id}&userId={id}&content={text}
```
**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| submissionId | Long | Yes | Submission ID |
| userId | Long | Yes | User creating comment |
| content | String | Yes | Comment text |

**Response:** `Comment`

---

### 3. Update Comment
```
PUT /api/v1/comments/{commentId}?userId={id}&content={text}
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| commentId | Long | Comment ID |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | Long | Yes | User ID (must be owner) |
| content | String | Yes | New comment text |

**Response:** `Comment`

---

### 4. Delete Comment
```
DELETE /api/v1/comments/{commentId}?userId={id}
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| commentId | Long | Comment ID |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | Long | Yes | User ID (must be owner) |

**Response:** `200 OK`

---

## Leaderboard APIs

Base Path: `/api/v1/leaderboard`

### 1. Get Challenge Leaderboard
```
GET /api/v1/leaderboard/challenge/{challengeId}?limit={limit}&userId={id}&type={type}
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| challengeId | Long | Challenge ID |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | int | 10 | Max entries (max 100) |
| userId | Long | - | Include this user's rank |
| type | String | OVERALL | SUBMISSIONS, GLORIES, STREAK, OVERALL |

**Response:** `LeaderboardResponse`

---

### 2. Get User Rank
```
GET /api/v1/leaderboard/challenge/{challengeId}/user/{userId}/rank
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| challengeId | Long | Challenge ID |
| userId | Long | User ID |

**Response:** `UserRankDTO`

---

### 3. Update Score (Admin)
```
POST /api/v1/leaderboard/score
```
**Request Body:**
```json
{
  "challengeId": "Long (required)",
  "userId": "Long (required)",
  "score": "Double (required)"
}
```
**Response:** `{ "message": "Score updated successfully" }`

---

### 4. Rebuild Leaderboard (Admin)
```
POST /api/v1/leaderboard/challenge/{challengeId}/rebuild
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| challengeId | Long | Challenge ID |

**Response:** `{ "message": "Leaderboard rebuilt successfully" }`

---

### 5. Remove User from Leaderboard (Admin)
```
DELETE /api/v1/leaderboard/challenge/{challengeId}/user/{userId}
```
**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| challengeId | Long | Challenge ID |
| userId | Long | User ID |

**Response:** `{ "message": "User removed from leaderboard successfully" }`

---

## Response Objects

### FeedItemResponse
```json
{
  "submissionId": "Long",
  "userId": "Long",
  "username": "String",
  "userProfilePicUrl": "String",
  "challengeId": "Long",
  "challengeTitle": "String",
  "dayNumber": "Integer",
  "description": "String",
  "mediaUrls": ["String"],
  "gloriesCount": "Long",
  "commentsCount": "Long",
  "createdAt": "Timestamp",
  "isGloriedByCurrentUser": "Boolean"
}
```

### FeedResponse
```json
{
  "items": [FeedItemResponse],
  "page": "int",
  "pageSize": "int",
  "totalItems": "long",
  "totalPages": "int",
  "hasMore": "boolean",
  "feedType": "String"
}
```

### LeaderboardResponse
```json
{
  "challengeId": "Long",
  "entries": [
    {
      "rank": "Integer",
      "userId": "Long",
      "username": "String",
      "score": "Double",
      "rankChange": "Integer"
    }
  ],
  "userRank": {
    "rank": "Integer",
    "score": "Double",
    "percentile": "Double"
  }
}
```

---

## Frontend Integration Guide

### 1. API Client Setup (React/Next.js with Axios)

```typescript
// lib/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login or refresh token
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 2. Service Layer Example

```typescript
// services/challengeService.ts
import { api } from '@/lib/api';

export const challengeService = {
  getRecent: (page = 1, pageSize = 10) =>
    api.get(`/challenges/recent?page=${page}&pageSize=${pageSize}`),

  getPopular: (params?: { active?: boolean; page?: number; pageSize?: number }) =>
    api.get('/challenges/popular', { params }),

  create: (data: ChallengeCreateRequest) =>
    api.post('/challenges/create', data),

  join: (challengeId: number, userIds: number[]) =>
    api.post('/challenges/joinChallenge', { challengeId, userIds }),

  leave: (challengeId: number, userIds: number[]) =>
    api.post('/challenges/leaveChallenge', { challengeId, userIds }),

  getParticipants: (challengeId: number) =>
    api.post('/challenges/getParticipants', { challengeId }),
};
```

### 3. React Query Hooks (Recommended)

```typescript
// hooks/useChallenges.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { challengeService } from '@/services/challengeService';

export function useRecentChallenges(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['challenges', 'recent', page, pageSize],
    queryFn: () => challengeService.getRecent(page, pageSize),
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache TTL)
  });
}

export function useJoinChallenge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ challengeId, userIds }: { challengeId: number; userIds: number[] }) =>
      challengeService.join(challengeId, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
```

### 4. Feed Component Example

```tsx
// components/Feed.tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function Feed({ userId }: { userId: number }) {
  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['feed', 'following', userId],
    queryFn: ({ pageParam = 1 }) =>
      api.get(`/feed/following/${userId}?page=${pageParam}&pageSize=20`),
    getNextPageParam: (lastPage) =>
      lastPage.data.hasMore ? lastPage.data.page + 1 : undefined,
  });

  if (isLoading) return <Loading />;

  return (
    <div>
      {data?.pages.flatMap((page) =>
        page.data.items.map((item) => (
          <FeedItem key={item.submissionId} item={item} />
        ))
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>Load More</button>
      )}
    </div>
  );
}
```

### 5. Error Handling

```typescript
// types/errors.ts
interface ApiError {
  status: number;
  message: string;
  timestamp: string;
}

// Use in components
try {
  await challengeService.create(data);
} catch (error) {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    toast.error(apiError.message || 'Something went wrong');
  }
}
```

### 6. Optimistic Updates for Likes (Glory)

```typescript
// hooks/useGlory.ts
export function useToggleGlory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, userId }: { submissionId: number; userId: number }) =>
      api.post(`/glories/toggle?submissionId=${submissionId}&userId=${userId}`),
    
    // Optimistic update
    onMutate: async ({ submissionId }) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      
      // Snapshot current state
      const previousFeed = queryClient.getQueryData(['feed']);
      
      // Optimistically update
      queryClient.setQueryData(['feed'], (old: any) => ({
        ...old,
        items: old.items.map((item: any) =>
          item.submissionId === submissionId
            ? {
                ...item,
                isGloriedByCurrentUser: !item.isGloriedByCurrentUser,
                gloriesCount: item.isGloriedByCurrentUser
                  ? item.gloriesCount - 1
                  : item.gloriesCount + 1,
              }
            : item
        ),
      }));
      
      return { previousFeed };
    },
    
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['feed'], context?.previousFeed);
    },
  });
}
```

---

## Quick Reference

| Feature | Endpoint | Method |
|---------|----------|--------|
| Register | `/users/register` | POST |
| Get User | `/users/getUser` | GET |
| Follow | `/users/follow` | POST |
| Unfollow | `/users/unfollow` | POST |
| Create Challenge | `/challenges/create` | POST |
| Join Challenge | `/challenges/joinChallenge` | POST |
| Leave Challenge | `/challenges/leaveChallenge` | POST |
| Recent Challenges | `/challenges/recent` | GET |
| Popular Challenges | `/challenges/popular` | GET |
| Create Submission | `/submissions` | POST |
| Get Presigned URLs | `/submissions/presignedUrls` | POST |
| Following Feed | `/feed/following/{userId}` | GET |
| Trending Feed | `/feed/trending` | GET |
| Explore Feed | `/feed/explore` | GET |
| Toggle Glory | `/glories/toggle` | POST |
| Get Comments | `/comments/submission/{id}` | GET |
| Create Comment | `/comments` | POST |
| Leaderboard | `/leaderboard/challenge/{id}` | GET |

# ChallengeSphere API Framework Documentation

## Overview

This API framework provides a complete solution for making HTTP requests, managing authentication, and handling data caching in your React Native app using TypeScript. It's built with modern libraries and follows best practices for performance and developer experience.

## Tech Stack

- **HTTP Client**: Axios with interceptors for request/response handling
- **State Management**: TanStack Query (React Query) for server state management
- **Caching**: AsyncStorage for token persistence
- **TypeScript**: Full type safety for all API operations

## Architecture

```
services/
├── apiClient.ts          # HTTP client with interceptors
├── authService.ts        # Authentication operations
├── challengeService.ts   # Challenge CRUD operations
├── feedService.ts        # Feed and social features
├── userService.ts        # User management
└── mediaService.ts       # Media upload operations

hooks/
├── useAuth.ts           # Authentication hooks
├── useChallenges.ts     # Challenge management hooks
├── useFeed.ts           # Feed and social hooks
├── useUsers.ts          # User management hooks
└── useMedia.ts          # Media upload hooks

types/
└── api.ts               # TypeScript definitions

providers/
└── QueryProvider.tsx    # React Query setup
```

## Quick Start

### 1. Setup (Already Done)

The API framework is already integrated into your app with:
- QueryProvider wrapped around your app in `app/_layout.tsx`
- All dependencies installed
- TypeScript definitions ready

### 2. Basic Usage

```tsx
import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useUserChallenges } from '@/hooks/useChallenges';

export function ChallengeScreen({ userId }: { userId: number }) {
  const { data, isLoading, error } = useUserChallenges(userId);

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error loading challenges</Text>;

  return (
    <FlatList
      data={data?.challenges}
      keyExtractor={(item) => item.challengeId.toString()}
      renderItem={({ item }) => (
        <View>
          <Text>{item.title}</Text>
          <Text>{item.description}</Text>
        </View>
      )}
    />
  );
}
```

## Authentication

### Login with Username/Password
```tsx
import { useLogin } from '@/hooks/useAuth';

function LoginScreen() {
  const loginMutation = useLogin();

  const handleLogin = () => {
    loginMutation.mutate({
      username: 'user123',
      password: 'password123'
    }, {
      onSuccess: (data) => {
        console.log('Logged in, token:', data.accessToken);
        // Navigate to main app
      },
      onError: (error) => {
        console.error('Login failed:', error);
      }
    });
  };

  return (
    <TouchableOpacity onPress={handleLogin}>
      <Text>Login</Text>
    </TouchableOpacity>
  );
}
```

### Register New User
```tsx
import { useRegister } from '@/hooks/useAuth';

function RegisterScreen() {
  const registerMutation = useRegister();

  const handleRegister = () => {
    registerMutation.mutate({
      emailId: 'user@example.com',
      username: 'newuser',
      password: 'securePassword123',
      phone: '1234567890',
      bio: 'Hello, I am new here!'
    }, {
      onSuccess: (data) => {
        if (data.success) {
          console.log('Registration successful:', data.message);
          // Navigate to login screen
        }
      },
      onError: (error) => {
        console.error('Registration failed:', error);
      }
    });
  };

  return (
    <TouchableOpacity onPress={handleRegister}>
      <Text>Register</Text>
    </TouchableOpacity>
  );
}
```

### Change Password
```tsx
import { useChangePassword } from '@/hooks/useAuth';

function ChangePasswordScreen() {
  const changePassword = useChangePassword();

  const handleChangePassword = () => {
    changePassword.mutate({
      oldPassword: 'currentPassword',
      newPassword: 'NewSecure@123',
      confirmPassword: 'NewSecure@123'
    }, {
      onSuccess: (data) => {
        console.log('Password changed:', data.message);
      }
    });
  };

  return (
    <TouchableOpacity onPress={handleChangePassword}>
      <Text>Change Password</Text>
    </TouchableOpacity>
  );
}
```

## Challenges

### Create Challenge
```tsx
import { useCreateChallenge } from '@/hooks/useChallenges';

function CreateChallengeForm({ userId }: { userId: number }) {
  const createChallenge = useCreateChallenge();

  const handleSubmit = () => {
    createChallenge.mutate({
      title: '30 Day Fitness Challenge',
      description: 'Complete a 30-minute workout every day',
      creatorUserId: userId,
      numberOfDays: 30,
      hashtags: 'fitness,workout,health',
      categories: 'fitness,health',
      benefits: 'Improved fitness, better sleep',
      isPrivate: false,
      startDate: new Date().toISOString().split('T')[0],
      reminderTime: '08:00 AM'
    }, {
      onSuccess: (challenge) => {
        console.log('Challenge created:', challenge.challengeId);
      }
    });
  };

  return (
    <TouchableOpacity onPress={handleSubmit}>
      <Text>Create Challenge</Text>
    </TouchableOpacity>
  );
}
```

### Join Challenge
```tsx
import { useJoinChallenge } from '@/hooks/useChallenges';

function JoinChallengeButton({ challengeId, userId }: { challengeId: number; userId: number }) {
  const joinChallenge = useJoinChallenge();

  const handleJoin = () => {
    joinChallenge.mutate({
      challengeId,
      userIds: [userId]
    }, {
      onSuccess: (response) => {
        if (response.success) {
          console.log('Joined challenge:', response.message);
        }
      }
    });
  };

  return (
    <TouchableOpacity onPress={handleJoin}>
      <Text>Join Challenge</Text>
    </TouchableOpacity>
  );
}
```

### Get Popular Challenges
```tsx
import { usePopularChallenges, useInfinitePopularChallenges } from '@/hooks/useChallenges';

// Paginated
function PopularChallengesList() {
  const { data, isLoading } = usePopularChallenges(1, 10);

  return (
    <FlatList
      data={data?.challenges}
      renderItem={({ item }) => (
        <View>
          <Text>{item.challenge.title}</Text>
          <Text>{item.participantCount} participants</Text>
        </View>
      )}
    />
  );
}

// Infinite scroll
function InfinitePopularChallenges() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfinitePopularChallenges(10);

  const challenges = data?.pages.flatMap(page => page.challenges) || [];

  return (
    <FlatList
      data={challenges}
      renderItem={({ item }) => (
        <View>
          <Text>{item.challenge.title}</Text>
          <Text>{item.participantCount} participants</Text>
        </View>
      )}
      onEndReached={() => hasNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={isFetchingNextPage ? <Text>Loading more...</Text> : null}
    />
  );
}
```

### Create Submission
```tsx
import { useCreateSubmission } from '@/hooks/useChallenges';
import { useUploadSubmissionMedia } from '@/hooks/useMedia';

function SubmissionForm({ userId, challengeId, dayNumber }: { 
  userId: number; 
  challengeId: number;
  dayNumber: number;
}) {
  const createSubmission = useCreateSubmission();
  const { uploadMedia, isLoading: isUploading } = useUploadSubmissionMedia();

  const handleSubmit = async (description: string, files: File[]) => {
    try {
      // Upload media files first
      let mediaUrls: string[] = [];
      if (files.length > 0) {
        mediaUrls = await uploadMedia(userId, files, (progress) => {
          console.log('Upload progress:', progress);
        });
      }

      // Create submission with uploaded media URLs
      createSubmission.mutate({
        userId,
        challengeId,
        dayNumber,
        description,
        mediaUrls,
        isPrivate: false
      }, {
        onSuccess: (response) => {
          if (response.success) {
            console.log('Submission created:', response.submissionId);
          }
        }
      });
    } catch (error) {
      console.error('Submission failed:', error);
    }
  };

  return (
    <View>
      {/* Form UI */}
    </View>
  );
}
```

## Feed & Social Features

### Get Feed
```tsx
import { useFollowingFeed, useInfiniteFollowingFeed, useTrendingFeed, useExploreFeed } from '@/hooks/useFeed';

// Following feed (from users you follow)
function FollowingFeedScreen({ userId }: { userId: number }) {
  const { data, fetchNextPage, hasNextPage } = useInfiniteFollowingFeed(userId, 20);

  const items = data?.pages.flatMap(page => page.items) || [];

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.submissionId.toString()}
      renderItem={({ item }) => (
        <View>
          <Text>{item.username}</Text>
          <Text>{item.challengeTitle} - Day {item.dayNumber}</Text>
          <Text>{item.description}</Text>
          <Text>🔥 {item.gloriesCount} | 💬 {item.commentsCount}</Text>
        </View>
      )}
      onEndReached={() => hasNextPage && fetchNextPage()}
    />
  );
}

// Trending feed
function TrendingFeedScreen() {
  const { data, isLoading } = useTrendingFeed(1, 20);

  return (
    <FlatList
      data={data?.items}
      renderItem={({ item }) => <FeedItem item={item} />}
    />
  );
}

// Explore feed
function ExploreFeedScreen() {
  const { data, isLoading } = useExploreFeed(1, 20);

  return (
    <FlatList
      data={data?.items}
      renderItem={({ item }) => <FeedItem item={item} />}
    />
  );
}
```

### Toggle Glory (Like)
```tsx
import { useToggleGlory } from '@/hooks/useFeed';

function GloryButton({ submissionId, userId, isGloried, gloriesCount }: {
  submissionId: number;
  userId: number;
  isGloried: boolean;
  gloriesCount: number;
}) {
  const toggleGlory = useToggleGlory();

  const handleToggle = () => {
    toggleGlory.mutate({ submissionId, userId });
  };

  return (
    <TouchableOpacity onPress={handleToggle}>
      <Text>{isGloried ? '🔥' : '⚪️'} {gloriesCount}</Text>
    </TouchableOpacity>
  );
}
```

### Comments
```tsx
import { useFeedComments, useAddComment } from '@/hooks/useFeed';

function CommentSection({ submissionId }: { submissionId: number }) {
  const { data: comments } = useFeedComments(submissionId);
  const addComment = useAddComment();
  const [newComment, setNewComment] = useState('');

  const handleAddComment = () => {
    addComment.mutate({
      postId: submissionId.toString(),
      content: newComment
    }, {
      onSuccess: () => {
        setNewComment('');
      }
    });
  };

  return (
    <View>
      <FlatList
        data={comments?.comments}
        renderItem={({ item }) => (
          <View>
            <Text>{item.user.username}</Text>
            <Text>{item.content}</Text>
          </View>
        )}
      />
      <TextInput
        value={newComment}
        onChangeText={setNewComment}
        placeholder="Add a comment..."
      />
      <TouchableOpacity onPress={handleAddComment}>
        <Text>Post</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## User Management

### Get User Profile
```tsx
import { useUser, useUserByUsername } from '@/hooks/useUsers';

function UserProfile({ userId }: { userId: number }) {
  const { data: user, isLoading } = useUser(userId);

  if (isLoading) return <Text>Loading...</Text>;

  return (
    <View>
      <Image source={{ uri: user?.profilePicUrl }} />
      <Text>{user?.username}</Text>
      <Text>{user?.bio}</Text>
      <View>
        <Text>{user?.followersCount} Followers</Text>
        <Text>{user?.followingCount} Following</Text>
      </View>
    </View>
  );
}
```

### Follow/Unfollow Users
```tsx
import { useFollowAction, useIsFollowing } from '@/hooks/useUsers';

function FollowButton({ currentUserId, targetUserId }: { currentUserId: number; targetUserId: number }) {
  const { data: isFollowing } = useIsFollowing(currentUserId, targetUserId);
  const followAction = useFollowAction();

  const handleToggle = () => {
    followAction.mutate({
      followerId: currentUserId,
      followingId: targetUserId,
      follow: !isFollowing
    });
  };

  return (
    <TouchableOpacity onPress={handleToggle}>
      <Text>{isFollowing ? 'Unfollow' : 'Follow'}</Text>
    </TouchableOpacity>
  );
}
```

### Followers/Following Lists
```tsx
import { useInfiniteUserFollowers, useInfiniteUserFollowing } from '@/hooks/useUsers';

function FollowersList({ userId }: { userId: number }) {
  const { data, fetchNextPage, hasNextPage } = useInfiniteUserFollowers(userId, 20);

  const users = data?.pages.flatMap(page => page.users) || [];

  return (
    <FlatList
      data={users}
      renderItem={({ item }) => (
        <View>
          <Image source={{ uri: item.profilePicUrl }} />
          <Text>{item.username}</Text>
        </View>
      )}
      onEndReached={() => hasNextPage && fetchNextPage()}
    />
  );
}
```

### Leaderboard
```tsx
import { useChallengeLeaderboard, useGlobalLeaderboard } from '@/hooks/useUsers';
import { LeaderboardType } from '@/types/api';

// Challenge-specific leaderboard
function ChallengeLeaderboard({ challengeId, userId }: { challengeId: number; userId: number }) {
  const { data: leaderboard } = useChallengeLeaderboard(
    challengeId, 
    LeaderboardType.OVERALL, 
    10, 
    userId
  );

  return (
    <View>
      <Text>{leaderboard?.challengeTitle} Leaderboard</Text>
      <FlatList
        data={leaderboard?.entries}
        renderItem={({ item }) => (
          <View>
            <Text>#{item.rank}</Text>
            <Image source={{ uri: item.profilePictureUrl }} />
            <Text>{item.displayName || item.username}</Text>
            <Text>{item.score} points</Text>
            <Text>🔥 {item.currentStreak} streak</Text>
          </View>
        )}
      />
      {leaderboard?.currentUserRank && (
        <View>
          <Text>Your Rank: #{leaderboard.currentUserRank.rank}</Text>
          <Text>Score: {leaderboard.currentUserRank.score}</Text>
          <Text>Top {leaderboard.currentUserRank.percentile?.toFixed(1)}%</Text>
        </View>
      )}
    </View>
  );
}

// Global leaderboard
function GlobalLeaderboard() {
  const { data: leaderboard } = useGlobalLeaderboard(LeaderboardType.OVERALL, 50);

  return (
    <FlatList
      data={leaderboard?.entries}
      renderItem={({ item }) => (
        <View>
          <Text>#{item.rank} {item.username} - {item.score} pts</Text>
        </View>
      )}
    />
  );
}
```

## Media Upload

### Upload Profile Picture
```tsx
import { useUploadProfilePicture } from '@/hooks/useUsers';

function ProfilePictureUpload({ userId }: { userId: number }) {
  const uploadPicture = useUploadProfilePicture();
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = (imageFile: File) => {
    uploadPicture.mutate({
      userId,
      imageFile,
      onProgress: setUploadProgress
    }, {
      onSuccess: (response) => {
        console.log('Profile picture updated:', response.profilePicUrl);
      }
    });
  };

  return (
    <View>
      <Text>Upload Progress: {uploadProgress}%</Text>
      {/* File picker UI */}
    </View>
  );
}
```

### Upload Submission Media
```tsx
import { useUploadSubmissionMedia } from '@/hooks/useMedia';

function MediaUploader({ userId }: { userId: number }) {
  const { uploadMedia, isLoading } = useUploadSubmissionMedia();
  const [progress, setProgress] = useState(0);

  const handleUpload = async (files: File[]) => {
    const uploadedUrls = await uploadMedia(userId, files, setProgress);
    console.log('Uploaded files:', uploadedUrls);
    return uploadedUrls;
  };

  return (
    <View>
      <Text>Upload Progress: {progress}%</Text>
      {isLoading && <ActivityIndicator />}
    </View>
  );
}
```

## Error Handling

All hooks include built-in error handling:

```tsx
function MyComponent() {
  const { data, isLoading, error, refetch } = useUserChallenges(userId);

  if (error) {
    return (
      <View>
        <Text>Something went wrong!</Text>
        <Text>{error.message}</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ... rest of component
}
```

## Configuration

### API Base URL

Update the base URL in `services/apiClient.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8080/api'        // Development
  : 'https://your-api.com/api';        // Production
```

### Query Configuration

Modify caching and retry behavior in `providers/QueryProvider.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes
      gcTime: 10 * 60 * 1000,      // 10 minutes
      retry: 3,                     // Retry failed requests 3 times
    },
  },
});
```

## Type Reference

### Key Types

```typescript
// User
interface UserProfileResponse {
  userId: number;
  username: string;
  email: string;
  fullName?: string;
  bio?: string;
  profilePicUrl?: string;
  followersCount: number;
  followingCount: number;
}

// Challenge
interface Challenge {
  challengeId: number;
  title: string;
  description: string;
  numberOfDays: number;
  creatorId: number;
  hashtags?: string;
  categories?: string;
  isPrivate?: boolean;
  startDate?: string;
}

// Feed Item
interface FeedItem {
  submissionId: number;
  userId: number;
  username: string;
  challengeId: number;
  challengeTitle: string;
  dayNumber: number;
  description: string;
  mediaUrls?: string[];
  gloriesCount: number;
  commentsCount: number;
  isGloriedByCurrentUser?: boolean;
}

// Leaderboard Entry
interface LeaderboardEntry {
  userId: number;
  username: string;
  rank: number;
  score: number;
  currentStreak?: number;
  gloriesCount?: number;
}
```

## Best Practices

1. **Use TypeScript**: All API responses are fully typed
2. **Handle Loading States**: Always show loading indicators
3. **Handle Errors**: Show appropriate error messages to users
4. **Optimistic Updates**: Use optimistic updates for better UX
5. **Cache Invalidation**: Hooks automatically invalidate related queries
6. **Pagination**: Use infinite scroll hooks for large lists
7. **Media Uploads**: Always upload media before creating submissions

This API framework provides everything you need to build a robust, scalable React Native app with proper data management, caching, and error handling!

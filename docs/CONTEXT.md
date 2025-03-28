# Free Chat App Documentation

## Table of Contents
- [Overview](#overview)
- [User Flow](#user-flow)
- [Features](#features)
- [Technical Stack](#technical-stack)
- [Implementation Guidelines](#implementation-guidelines)

## Overview
The Free Chat App is a modern messaging platform that enables users to connect with friends through email and password authentication. It provides a seamless real-time messaging experience with features including message history, online status indicators, notifications, and comprehensive user management options.

### Tech Stack
- Frontend: React Native with TypeScript, Expo, and Expo Router
- Backend/Database: Supabase
- UI Framework: React Native Paper
## User Flow

### 1. Welcome Screen
- Clean and minimalistic interface
- Authentication options:
  - Sign Up
  - Login
- Automatic redirection to Main Chat Dashboard after successful authentication

### 2. Authentication Flow

#### Sign-Up Process
1. User enters:
   - Name
   - Email
   - Password

2. Redirect to Chat Dashboard upon success

#### Login Process
1. User enters:
   - Email
   - Password
2. Success: Redirect to Chat Dashboard
3. Failure: Display error message with password reset option

### 3. Main Chat Dashboard

#### Friend List & Conversations
- Display list of friends and recent conversations
- Interactive friend selection
- Search functionality
- Friend invitation system

#### Chat Window Features
- Real-time messaging interface
- Message input system
- Instant message delivery
- Typing indicators
- Read receipts
- Message timestamps
- Media sharing capabilities

#### Notification System
- In-app notifications
- Push notifications
- Customizable notification preferences

### 4. User Profile & Management

#### Profile Settings
- Profile information management
- Password security
- Profile picture customization

#### Friends Management
- Friend addition system
- Request handling
- User blocking functionality

### 5. Settings
- Account preferences
- Notification controls
- Privacy settings
- Logout functionality

## Features

### 1. Authentication System
- Email/password authentication
- Optional email verification
- Password recovery system

### 2. Real-Time Messaging
- Instant message delivery
- Message status indicators
- Timestamp system
- Multimedia support

### 3. Friend System
- Friend management
- User blocking
- Request handling

### 4. Notification System
- Real-time alerts
- Push notifications
- Customizable settings

### 5. User Settings
- Profile management
- Security settings
- Privacy controls

## Technical Stack

### Frontend
- React Native with TypeScript
- Expo and Expo Router
- React Native Paper UI Framework
- Supabase for Backend/Database

### Backend
- Supabase
- RESTful API architecture
- Real-time subscriptions

### Database
- Supabase PostgreSQL
- Real-time data sync
- Row Level Security (RLS)

### Authentication
- Supabase Auth
- Secure token management
- Session handling

### Real-Time Features
- Supabase Realtime
- Push notifications
- Live updates

## Database Schema

### Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'offline',
  settings JSONB DEFAULT '{}'::jsonb,
  phone_number TEXT UNIQUE,
  bio TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMP WITH TIME ZONE,
  notification_token TEXT,
  theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'system')),
  language_preference TEXT DEFAULT 'en',
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

#### conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  conversation_type TEXT DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group')),
  name TEXT,
  avatar_url TEXT,
  description TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_conversations_last_message ON conversations(last_message_at);
CREATE INDEX idx_conversations_type ON conversations(conversation_type);
```

#### conversation_participants
```sql
CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'moderator')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN DEFAULT FALSE,
  notification_preferences JSONB DEFAULT '{"messages": true, "mentions": true}'::jsonb,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_participants_user ON conversation_participants(user_id);
```

#### messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  reply_to_id UUID REFERENCES messages(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_system_message BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

#### message_reads
```sql
CREATE TABLE message_reads (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX idx_message_reads_user ON message_reads(user_id);
```

#### friend_requests
```sql
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message TEXT,
  UNIQUE(sender_id, receiver_id)
);

CREATE INDEX idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);
```

#### user_blocks
```sql
CREATE TABLE user_blocks (
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);
```

#### typing_indicators
```sql
CREATE TABLE typing_indicators (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);
```

### Database Functions and Triggers

```sql
-- Update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Update user status
CREATE OR REPLACE FUNCTION update_user_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET status = CASE
    WHEN NEW.is_online THEN 'online'
    ELSE 'offline'
  END,
  last_active_at = CASE
    WHEN NEW.is_online THEN NOW()
    ELSE last_active_at
  END
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_status_trigger
  AFTER UPDATE OF is_online ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_status();
```

## Project Structure

```
free-chat-app/
├── app/                      # Expo Router app directory
│   ├── (auth)/              # Authentication routes
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   └── verify-email.tsx
│   ├── (main)/              # Main app routes
│   │   ├── chat/
│   │   │   ├── [id].tsx     # Individual chat screen
│   │   │   ├── create.tsx   # Create new chat
│   │   │   └── index.tsx    # Chat list screen
│   │   ├── profile/
│   │   │   ├── edit.tsx     # Edit profile
│   │   │   └── index.tsx    # Profile screen
│   │   ├── settings/
│   │   │   ├── notifications.tsx
│   │   │   ├── privacy.tsx
│   │   │   ├── security.tsx
│   │   │   └── index.tsx
│   │   └── friends/
│   │       ├── requests.tsx
│   │       └── index.tsx
│   ├── _layout.tsx          # Root layout
│   └── index.tsx            # Entry point
├── src/
│   ├── components/          # Reusable components
│   │   ├── chat/           # Chat-related components
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ChatHeader.tsx
│   │   │   └── MessageList.tsx
│   │   ├── common/         # Common UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Avatar.tsx
│   │   │   └── Loading.tsx
│   │   └── profile/        # Profile-related components
│   │       ├── ProfileHeader.tsx
│   │       └── ProfileForm.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useChat.ts
│   │   ├── useTheme.ts
│   │   ├── useNotifications.ts
│   │   └── useSupabase.ts
│   ├── services/           # API and external services
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── chat.ts
│   │   │   └── storage.ts
│   │   └── notifications/
│   │       ├── push.ts
│   │       └── inApp.ts
│   ├── stores/            # State management
│   │   ├── auth/
│   │   │   ├── authStore.ts
│   │   │   └── authTypes.ts
│   │   └── chat/
│   │       ├── chatStore.ts
│   │       └── chatTypes.ts
│   ├── types/             # TypeScript types/interfaces
│   │   ├── chat.ts
│   │   ├── user.ts
│   │   ├── supabase.ts
│   │   └── common.ts
│   ├── utils/             # Utility functions
│   │   ├── constants/
│   │   │   ├── theme.ts
│   │   │   ├── config.ts
│   │   │   └── api.ts
│   │   ├── helpers/
│   │   │   ├── date.ts
│   │   │   ├── validation.ts
│   │   │   └── formatting.ts
│   │   └── hooks/
│   │       ├── useDebounce.ts
│   │       └── useLocalStorage.ts
│   └── config/            # Configuration files
│       ├── theme.ts
│       └── navigation.ts
├── assets/                # Static assets
│   ├── images/
│   │   ├── icons/
│   │   └── backgrounds/
│   ├── fonts/
│   └── animations/
├── docs/                  # Documentation
│   ├── CONTEXT.md
│   ├── API.md
│   └── DEPLOYMENT.md
├── tests/                 # Test files
│   ├── components/
│   │   ├── chat/
│   │   └── common/
│   ├── hooks/
│   ├── utils/
│   └── __mocks__/
├── scripts/              # Build and deployment scripts
│   ├── build.sh
│   └── deploy.sh
├── .env.example          # Environment variables example
├── .env.development      # Development environment variables
├── .env.production       # Production environment variables
├── app.json              # Expo config
├── babel.config.js       # Babel config
├── tsconfig.json         # TypeScript config
├── jest.config.js        # Jest config
├── package.json          # Dependencies
└── README.md            # Project documentation
```

## Implementation Guidelines

### Performance Optimization
- Efficient database queries
- Caching implementation
- Load balancing

### Security Measures
- End-to-end encryption
- Secure authentication
- Data protection

### User Experience
- Responsive design
- Dark mode support
- Intuitive interface

### Development Best Practices
- Code modularity
- Testing implementation
- Documentation
- Version control

---

*Note: This documentation serves as a comprehensive guide for implementing the Free Chat App. Developers should follow these guidelines while maintaining flexibility for specific implementation needs.*

# esmeringhoyringer

Anonymous chat with three modes, built on React 18 + Vite + Firebase (Anonymous Auth + Firestore). No accounts.

- **1-on-1:** random pairing through a Firestore waiting list. People who share topics or a location are preferred, but anyone waiting can be matched.
- **Group:** public rooms. Join a preset room, one of your topics, or make up a name.
- **Private:** one person creates a 6-character code, the other enters it.
- Safety: 18+ confirmation, report (with reason), block (blocked people are never matched with you again), leave anytime.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Firebase web config.
3. Firebase Console
   - **Authentication → Sign-in method → Anonymous: enable**
   - **Firestore Database:** create one, then paste `firestore.rules` into the Rules tab and publish.
   - **TTL policies** (Firestore → Indexes → TTL) on field `expireAt`, for collection groups: `queue`, `privateRooms`, `members`, `messages`, `chats`. This deletes abandoned queue entries and old chats/messages automatically (messages and chats last 24 hours).
4. `npm run dev`
5. Test with two different browsers (or one normal + one incognito window) so you get two anonymous users.

## How matching works (no Cloud Functions needed)
Each searching person writes a `queue/{uid}` document and refreshes it every 12 s. Every 3 s the client looks at the other waiting entries, picks the best one, and pairs both of you in a single Firestore transaction (creates `chats/{id}` and marks both queue entries `matched`). The security rules only allow that update when a real chat containing both people is written in the same commit, and they refuse the chat if either person blocked the other.

## Structure
```
src/
├── pages/RandomChatPage.jsx        picks which view to show
├── components/random/              SetupCard, SearchingView, PrivateWaiting, DirectChat, GroupRoom
├── components/chat/                MessageBubble, MessageList, Composer
├── hooks/                          useMatchmaking, usePrivateRoom, useGroupChat, useChatRoom, useChatSetup
├── services/                       the only files that import Firebase
├── utils/ config/ lib/ context/ styles/
```

## Known limits
- Anyone can use anonymous sessions, so a determined abuser can create many identities. Turn on **App Check** and add rate limits before launch.
- Reports are stored but there's no moderation dashboard yet; read them in the Firebase console. Reports don't include message text.
- The 18+ checkbox is a self-declaration, not verification.
- A chat only ends when someone leaves or closes the tab. A crashed browser leaves the chat open for the other person until they press Next.
- Matching runs in the browser. It's fine for a small community; at scale, move it to a server-side function.

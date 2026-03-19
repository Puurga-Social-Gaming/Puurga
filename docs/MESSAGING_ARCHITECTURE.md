# Messaging Feature Architecture Proposal

## Current Architecture Analysis

### Existing Features
| Feature | Status | Implementation |
|---------|--------|----------------|
| Text messaging | ✅ Active | WebSocket via `websocketManager.ts` (singleton pattern) |
| Image sending | ✅ Implemented | Compression + upload to `/api/users/upload`, display in chat bubbles |
| Typing indicators | ✅ Supported | WS events |
| Online status | ✅ Tracked | WS connect/disconnect events |
| JWT authentication | ✅ | Token passed as query parameter on WS connection |

### Key Files
- `Messages.tsx` - Chat UI with conversation list
- `MessagesContext.tsx` - Conversation model, WebSocket integration
- `websocketManager.ts` - Backend singleton WebSocket server (238 lines)
- `useWebSocket.ts` - Frontend WebSocket event subscription hook

---

## Recommended Approach for Future Features

### 1. Image Sending Enhancements

**Current state**: Works but basic.

**Potential additions**:
- Image lightbox/gallery viewer for full-screen viewing
- Image download functionality
- Image forwarding to other conversations

**Files to modify**:
- `Messages.tsx` - UI enhancements
- `MessagesContext.tsx` - Add image-specific message types

### 2. Voice Calls

**Technology**: WebRTC via `RTCPeerConnection`

**Signaling**: Reuse existing WebSocket infrastructure in `websocketManager.ts`

**New WS message types needed**:
```
call_offer     - Initiator sends SDP offer
call_answer    - Callee sends SDP answer  
ice_candidate  - ICE candidate exchange
call_end       - Either party ends call
call_ringing   - Call is ringing
call_busy      - Callee is on another call
```

**New frontend files**:
- `src/services/callService.ts` - WebRTC call management
- `src/hooks/useCall.ts` - Call state hook
- `src/components/Call/CallModal.tsx` - Call UI overlay

**Backend additions**:
- New WS handlers in `websocketManager.ts` for signaling relay
- Optional: STUN/TURN server configuration for NAT traversal

**Implementation notes**:
- Use `navigator.mediaDevices.getUserMedia({ audio: true })` for microphone access
- Implement simple audio-only peer connection
- Add call state UI (calling, ringing, connected, ended)

### 3. Video Calls

**Technology**: Same WebRTC as voice, with video track added

**Additional considerations**:
- Camera permissions via `navigator.mediaDevices.getUserMedia({ video: true })`
- Bandwidth management for video quality
- Video toggle during call (camera on/off)
- Picture-in-picture support

**Files**: Same as voice calls, extend `CallModal.tsx` with video element

**TURN server**: Recommended for reliable NAT traversal
- Self-hosted: `coturn` (open source)
- Hosted alternatives: Twilio, Agora, Daily.co

---

## Implementation Priority Recommendation

1. **Phase 1** - Image enhancements (low effort, high value)
2. **Phase 2** - Voice calls (medium effort, requires signaling)
3. **Phase 3** - Video calls (higher effort, requires TURN server)

---

## Risk Considerations

| Risk | Mitigation |
|------|------------|
| WebSocket overload | Rate limit call signaling messages |
| Poor call quality | Implement TURN server for NAT traversal |
| Browser compatibility | Test WebRTC on Chrome, Firefox, Safari, Edge |
| Privacy concerns | Clear call indicators, user consent for camera/mic |

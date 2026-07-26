import React, { useEffect, useRef, useState } from 'react';
import { X, Phone, Video } from 'lucide-react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import api from '../../lib/axios';

interface CallRoomProps {
  roomId: string;
  callType: 'video' | 'audio';
  userId: string;
  userName: string;
  onLeave: () => void;
}

const CallRoom: React.FC<CallRoomProps> = ({
  roomId,
  callType,
  userId,
  userName,
  onLeave,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zpRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const initCall = async () => {
      try {
        const { data } = await api.post('/calls/token', { roomId, userName });
        if (cancelled) return;

        const { token, appID } = data;
        if (!token || !appID) {
          setError('Call service returned an invalid token. Please try again.');
          setIsConnecting(false);
          return;
        }

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
          Number(appID),
          token,
          roomId,
          userId,
          userName
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        zp.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall,
          },
          showPreJoinView: callType === 'video',
          turnOnCameraWhenJoining: callType === 'video',
          turnOnMicrophoneWhenJoining: true,
          showMyCameraToggleButton: callType === 'video',
          showAudioVideoSettingsButton: callType === 'video',
          onJoinRoom: () => {
            setIsConnecting(false);
          },
          onLeaveRoom: () => {
            void api.post('/calls/end', { roomId, status: 'ended' }).catch(() => undefined);
            onLeave();
          },
        });
      } catch (err: any) {
        console.error('Failed to initialize call:', err);
        const msg =
          err?.response?.data?.error ||
          'Failed to start call. Please try again.';
        setError(msg);
        setIsConnecting(false);
      }
    };

    void initCall();

    return () => {
      cancelled = true;
      void api.post('/calls/end', { roomId, status: 'ended' }).catch(() => undefined);
      if (zpRef.current) {
        zpRef.current.destroy();
      }
    };
  }, [roomId, callType, userId, userName, onLeave]);

  const handleManualLeave = () => {
    void api.post('/calls/end', { roomId, status: 'ended' }).catch(() => undefined);
    onLeave();
  };
  if (error) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-card border border-border rounded-xl p-6 max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone size={32} className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Call Error</h3>
          <p className="text-muted text-sm mb-4">{error}</p>
          <button
            onClick={handleManualLeave}
            className="px-4 py-2 bg-accent text-black rounded-lg hover:opacity-90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      {isConnecting && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              {callType === 'video' ? (
                <Video size={32} className="text-accent" />
              ) : (
                <Phone size={32} className="text-accent" />
              )}
            </div>
            <p className="text-foreground font-medium">Connecting...</p>
            <p className="text-muted text-sm mt-1">Joining room {roomId}</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
      <button
        onClick={handleManualLeave}
        className="absolute top-4 right-4 z-20 p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
        aria-label="Leave call"
      >
        <X size={24} />
      </button>
    </div>
  );
};

export default CallRoom;

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Video, X, PhoneCall } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabaseClient';
import Avatar from '../Avatar';

interface CallInvite {
  id: string;
  caller_id: string;
  callee_id: string;
  conversation_id: string;
  call_type: 'audio' | 'video';
  room_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'missed';
  created_at: string;
}

interface CallNotificationProps {
  onAccept: (invite: CallInvite) => void;
  onDecline: (invite: CallInvite) => void;
  currentCallRoomId: string | null;
}

const CallNotification: React.FC<CallNotificationProps> = ({
  onAccept,
  onDecline,
  currentCallRoomId,
}) => {
  const { user } = useUser();
  const [pendingInvite, setPendingInvite] = useState<CallInvite | null>(null);
  const [callerInfo, setCallerInfo] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('call_invites')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_invites',
          filter: `callee_id=eq.${user.id}`,
        },
        async (payload) => {
          const invite = payload.new as CallInvite;
          if (invite.status === 'pending') {
            setPendingInvite(invite);

            const { data: callerData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', invite.caller_id)
              .single();

            if (callerData) {
              setCallerInfo(callerData);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_invites',
        },
        (payload) => {
          const invite = payload.new as CallInvite;
          if (
            pendingInvite?.id === invite.id &&
            invite.status !== 'pending'
          ) {
            setPendingInvite(null);
            setCallerInfo(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, pendingInvite?.id]);

  useEffect(() => {
    if (pendingInvite && !currentCallRoomId) {
      const timeout = setTimeout(() => {
        setPendingInvite(null);
        setCallerInfo(null);
        supabase
          .from('call_invites')
          .update({ status: 'missed', ended_at: new Date().toISOString() })
          .eq('id', pendingInvite.id);
      }, 30000);

      return () => clearTimeout(timeout);
    }
  }, [pendingInvite, currentCallRoomId]);

  const handleAccept = () => {
    if (pendingInvite) {
      onAccept(pendingInvite);
      setPendingInvite(null);
      setCallerInfo(null);
    }
  };

  const handleDecline = async () => {
    if (pendingInvite) {
      await supabase
        .from('call_invites')
        .update({ status: 'declined', ended_at: new Date().toISOString() })
        .eq('id', pendingInvite.id);

      onDecline(pendingInvite);
      setPendingInvite(null);
      setCallerInfo(null);
    }
  };

  if (!pendingInvite || currentCallRoomId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="fixed top-4 right-4 z-[9998] bg-card border border-border rounded-2xl shadow-2xl p-4 max-w-sm"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar
              src={callerInfo?.avatar_url || ''}
              alt={callerInfo?.full_name || 'Caller'}
              size="lg"
              userId={pendingInvite.caller_id}
              showOnlineStatus
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center animate-pulse">
              {pendingInvite.call_type === 'video' ? (
                <Video size={12} className="text-black" />
              ) : (
                <PhoneCall size={12} className="text-black" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">
              {callerInfo?.full_name || 'Someone'}
            </h4>
            <p className="text-sm text-muted">
              Incoming {pendingInvite.call_type} call
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleDecline}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
          >
            <X size={18} />
            <span>Decline</span>
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors"
          >
            <Phone size={18} />
            <span>Accept</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CallNotification;

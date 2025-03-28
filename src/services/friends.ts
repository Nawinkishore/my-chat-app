import { supabase } from './supabase/client';

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  friend_email: string;
}

export const friendsService = {
  async getFriends(): Promise<Friend[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        friend:friend_id (
          email
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (error) throw error;
    return (data || []).map(friend => ({
      ...friend,
      friend_email: friend.friend.email,
    }));
  },

  async getPendingRequests(): Promise<Friend[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        friend:friend_id (
          email
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;
    return (data || []).map(friend => ({
      ...friend,
      friend_email: friend.friend.email,
    }));
  },

  async sendFriendRequest(email: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get friend's user ID
    const { data: friend, error: friendError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (friendError) throw new Error('User not found');
    if (!friend) throw new Error('User not found');
    if (friend.id === user.id) throw new Error('Cannot add yourself as a friend');

    // Check if request already exists
    const { data: existing, error: existingError } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friend.id}),and(user_id.eq.${friend.id},friend_id.eq.${user.id})`);

    if (existingError) throw existingError;
    if (existing && existing.length > 0) throw new Error('Friend request already exists');

    // Send friend request
    const { error: requestError } = await supabase
      .from('friends')
      .insert({
        user_id: user.id,
        friend_id: friend.id,
        status: 'pending',
      });

    if (requestError) throw requestError;
  },

  async acceptFriendRequest(requestId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if request exists and is pending
    const { data: request, error: requestError } = await supabase
      .from('friends')
      .select('*')
      .eq('id', requestId)
      .eq('friend_id', user.id)
      .eq('status', 'pending')
      .single();

    if (requestError) throw new Error('Friend request not found');
    if (!request) throw new Error('Friend request not found');

    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .eq('friend_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;
  },

  async rejectFriendRequest(requestId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if request exists and is pending
    const { data: request, error: requestError } = await supabase
      .from('friends')
      .select('*')
      .eq('id', requestId)
      .eq('friend_id', user.id)
      .eq('status', 'pending')
      .single();

    if (requestError) throw new Error('Friend request not found');
    if (!request) throw new Error('Friend request not found');

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', requestId)
      .eq('friend_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;
  },
}; 
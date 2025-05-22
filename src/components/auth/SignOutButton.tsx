import React from 'react';
import { supabase } from '../../lib/supabaseClient';

const SignOutButton: React.FC = () => {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      alert('Error signing out: ' + error.message);
    } else {
      // Session state will be updated by the listener in App.tsx
      alert('Signed out successfully!');
    }
  };

  return (
    <button onClick={handleSignOut} style={{ padding: '8px 12px', cursor: 'pointer' }}>
      Sign Out
    </button>
  );
};

export default SignOutButton; 
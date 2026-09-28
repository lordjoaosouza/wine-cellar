import { useCallback, useEffect, useState } from "react";

import {
  getUserProfile,
  subscribeUserProfile,
  updateProfile,
} from "@/services/user-profile";
import { defaultUserProfile, type UserProfile } from "@/types/profile";

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(defaultUserProfile);

  useEffect(() => {
    let active = true;
    void getUserProfile().then((stored) => {
      if (active) {
        setProfile(stored);
      }
    });
    const unsubscribe = subscribeUserProfile(setProfile);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    setProfile(await getUserProfile());
  }, []);

  return { profile, refresh, updateProfile };
}

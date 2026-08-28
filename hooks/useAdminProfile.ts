"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AdminProfile = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  avatarUrl: string;
};

const EMPTY_PROFILE: AdminProfile = {
  id: "",
  email: "",
  fullName: "",
  phone: "",
  avatarUrl: "",
};

function fromUser(user: any): AdminProfile {
  const metadata = user?.user_metadata || {};
  return {
    id: user?.id || "",
    email: user?.email || "",
    fullName: metadata.full_name || metadata.name || "",
    phone: metadata.phone || "",
    avatarUrl: metadata.avatar_url || metadata.picture || "",
  };
}

export function useAdminProfile() {
  const [profile, setProfile] = useState<AdminProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setProfile(data.user ? fromUser(data.user) : EMPTY_PROFILE);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setProfile(session?.user ? fromUser(session.user) : EMPTY_PROFILE);
      setLoading(false);
    });

    const handleProfileUpdated = () => void reload();
    window.addEventListener("admin-profile-updated", handleProfileUpdated);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener("admin-profile-updated", handleProfileUpdated);
    };
  }, [reload]);

  return { profile, loading, reload };
}

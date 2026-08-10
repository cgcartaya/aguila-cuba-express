import { supabase } from "@/lib/supabase";

export type DepartureStatus = "scheduled" | "closed" | "completed" | "cancelled";

export type Departure = {
  id: string;
  title: string;
  departure_date: string;
  departure_time: string | null;
  origin: string;
  destination: string;
  description: string | null;
  status: DepartureStatus;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export async function getDepartures() {
  return supabase
    .from("departures")
    .select("*")
    .order("departure_date", { ascending: true })
    .order("sort_order", { ascending: true });
}

export async function getActiveDepartures() {
  return supabase
    .from("departures")
    .select("*")
    .eq("is_active", true)
    .order("departure_date", { ascending: true })
    .order("sort_order", { ascending: true });
}

export async function createDeparture(
  departure: Omit<Departure, "id" | "created_at">
) {
  return supabase.from("departures").insert(departure).select().single();
}

export async function updateDeparture(
  id: string,
  departure: Partial<Departure>
) {
  return supabase
    .from("departures")
    .update(departure)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteDeparture(id: string) {
  return supabase.from("departures").delete().eq("id", id);
}
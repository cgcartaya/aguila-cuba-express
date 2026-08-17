import { supabase } from "@/lib/supabase";

export type ModifierTemplateOption = {
  id: string;
  template_id: string;
  label: string;
  price_delta: number;
  sort_order: number;
  is_active: boolean;
};

export type ModifierTemplate = {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  max_selections: number;
  sort_order: number;
  is_active: boolean;
  menu_modifier_template_options: ModifierTemplateOption[];
};

export type ModifierTemplateInput = {
  id?: string;
  name: string;
  description?: string;
  is_required: boolean;
  max_selections: number;
  sort_order: number;
  is_active: boolean;
  options: {
    id?: string;
    label: string;
    price_delta: number;
    sort_order: number;
    is_active?: boolean;
  }[];
};

export async function getModifierTemplates(storeId: string) {
  const { data, error } = await supabase
    .from("menu_modifier_templates")
    .select(`
      id,
      store_id,
      name,
      description,
      is_required,
      max_selections,
      sort_order,
      is_active,
      menu_modifier_template_options (
        id,
        template_id,
        label,
        price_delta,
        sort_order,
        is_active
      )
    `)
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("sort_order", {
      foreignTable: "menu_modifier_template_options",
      ascending: true,
    });

  return {
    data: (data || []) as unknown as ModifierTemplate[],
    error,
  };
}

export async function saveModifierTemplate(
  storeId: string,
  input: ModifierTemplateInput
) {
  const payload = {
    store_id: storeId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    is_required: input.is_required,
    max_selections: Math.max(1, input.max_selections),
    sort_order: input.sort_order,
    is_active: input.is_active,
    updated_at: new Date().toISOString(),
  };

  let templateId = input.id;

  if (templateId) {
    const { error } = await supabase
      .from("menu_modifier_templates")
      .update(payload)
      .eq("id", templateId);

    if (error) return { data: null, error };

    const { error: clearError } = await supabase
      .from("menu_modifier_template_options")
      .delete()
      .eq("template_id", templateId);

    if (clearError) return { data: null, error: clearError };
  } else {
    const { data, error } = await supabase
      .from("menu_modifier_templates")
      .insert(payload)
      .select("id")
      .single();

    if (error || !data) return { data: null, error };
    templateId = data.id;
  }

  const cleanOptions = input.options
    .filter((option) => option.label.trim())
    .map((option, index) => ({
      template_id: templateId,
      label: option.label.trim(),
      price_delta: Number(option.price_delta) || 0,
      sort_order: option.sort_order ?? index,
      is_active: option.is_active !== false,
    }));

  if (cleanOptions.length > 0) {
    const { error } = await supabase
      .from("menu_modifier_template_options")
      .insert(cleanOptions);

    if (error) return { data: null, error };
  }

  return { data: { id: templateId }, error: null };
}

export async function deleteModifierTemplate(id: string) {
  return supabase.from("menu_modifier_templates").delete().eq("id", id);
}
